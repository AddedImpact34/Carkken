import * as path from "path";
import * as dotenv from "dotenv";

const base = process.env.INIT_CWD || process.cwd();
dotenv.config({ path: path.resolve(base, ".env") });
