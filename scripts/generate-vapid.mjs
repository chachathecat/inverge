import webPush from "web-push";

const keys = webPush.generateVAPIDKeys();

console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=");
console.log(keys.publicKey);
console.log("VAPID_PRIVATE_KEY=");
console.log(keys.privateKey);
console.log("VAPID_SUBJECT=");
console.log("mailto:admin@example.com");
