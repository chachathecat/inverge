export function globToRegExp(glob) {
  if (typeof glob !== "string" || glob.length === 0) {
    throw new TypeError("glob must be a non-empty string");
  }

  let source = "^";

  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];

    if (character === "*") {
      const isDoubleStar = glob[index + 1] === "*";

      if (isDoubleStar) {
        index += 1;

        if (glob[index + 1] === "/") {
          index += 1;
          source += "(?:.*/)?";
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }

      continue;
    }

    if (character === "?") {
      source += "[^/]";
      continue;
    }

    source += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }

  source += "$";
  return new RegExp(source);
}

export function matchesGlob(glob, filePath) {
  return globToRegExp(glob).test(String(filePath).replaceAll("\\", "/"));
}

export function firstMatchingGlob(patterns, filePath) {
  return patterns.find((pattern) => matchesGlob(pattern, filePath)) ?? null;
}
