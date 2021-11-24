import typescript from "rollup-plugin-typescript2";
import del from "rollup-plugin-delete";
import pkg from "./package.json";
import { terser } from "rollup-plugin-terser";

export default {
  input: "src/index.ts",
  output: {
    dir: "./dist",
    sourcemap: true,
    format: "es",
  },
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    del({
      targets: "dist/*",
    }),
    terser(),
    typescript({
      typescript: require("typescript"),
    }),
  ],
};
