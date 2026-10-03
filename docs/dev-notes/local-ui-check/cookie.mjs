import { encode } from "@auth/core/jwt";
const uid = process.argv[2];
const v = await encode({ token: { uid, sub: uid, name: "x" }, secret: process.env.AUTH_SECRET, salt: "authjs.session-token", maxAge: 86400 });
process.stdout.write(v);
