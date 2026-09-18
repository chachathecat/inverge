using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Web.Script.Serialization;
using Windows.Storage;
using Windows.Storage.Streams;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Globalization;

internal static class LocalOcr {
  // The installed desktop exposes split WinMetadata; bind the existing framework
  // async bridge by reflection instead of requiring an absent Windows SDK union.
  static Task<T> Wait<T>(object operation) {
    var method=typeof(System.WindowsRuntimeSystemExtensions).GetMethods().Single(m=>m.Name=="AsTask" && m.IsGenericMethodDefinition && m.GetParameters().Length==1 && m.GetParameters()[0].ParameterType.Name=="IAsyncOperation`1");
    return (Task<T>)method.MakeGenericMethod(typeof(T)).Invoke(null,new object[]{operation});
  }
  static int Main(string[] args) {
    Console.OutputEncoding=new UTF8Encoding(false);
    try { Run(args).GetAwaiter().GetResult(); return 0; }
    catch {Console.Error.WriteLine("local_ocr_failed");return 1;}
  }
  static async Task<string> ReadText(IRandomAccessStream stream,OcrEngine engine) {
    var decoder=await Wait<BitmapDecoder>(BitmapDecoder.CreateAsync(stream));
    if(decoder.PixelWidth>5000 || decoder.PixelHeight>5000 || (long)decoder.PixelWidth*decoder.PixelHeight>12000000)throw new InvalidDataException();
    using(var bitmap=await Wait<SoftwareBitmap>(decoder.GetSoftwareBitmapAsync())) {
      var result=await Wait<OcrResult>(engine.RecognizeAsync(bitmap));
      var lines=new List<string>();foreach(var line in result.Lines)lines.Add(line.Text);
      var text=String.Join("\n",lines);if(text.Length>40000)throw new InvalidDataException();return text;
    }
  }
  static async Task Run(string[] args) {
    if(args.Length!=1)throw new InvalidDataException();
    var input=Path.GetFullPath(args[0]);var info=new FileInfo(input);
    if(!info.Exists || info.Length<1 || info.Length>8388608)throw new InvalidDataException();
    var engine=OcrEngine.TryCreateFromLanguage(new Language("ko"));if(engine==null)throw new InvalidOperationException();
    var file=await Wait<StorageFile>(StorageFile.GetFileFromPathAsync(input));var texts=new List<string>();
    using(var stream=await Wait<IRandomAccessStream>(file.OpenAsync(FileAccessMode.Read))){texts.Add(await ReadText(stream,engine));}
    Console.WriteLine(new JavaScriptSerializer().Serialize(new {schemaVersion="local_ocr_draft.v1",engine="windows_builtin_ko",texts=texts,needsReview=true}));
  }
}
