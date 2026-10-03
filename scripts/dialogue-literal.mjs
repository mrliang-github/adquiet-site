// Templates contain a JS object literal, not executable importer code.
export function parseDialogueLiteral(source) {
  const tokenPattern = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?|[\[\]{},:]/gyu;
  const tokens = [];
  let position = 0;
  while (position < source.length) {
    if (/\s/u.test(source[position])) { position += 1; continue; }
    tokenPattern.lastIndex = position;
    const match = tokenPattern.exec(source);
    if (!match) throw new Error("对白只能包含数据字面量");
    tokens.push(match[0]);
    position = tokenPattern.lastIndex;
  }
  const json = tokens.map((token, index) => {
    if (token.startsWith('"') || token.startsWith("'")) {
      const text = token.slice(1, -1).replace(/\\(u[0-9a-f]{4}|x[0-9a-f]{2}|[\s\S])/giu, (_, escape) => {
        if (/^[ux]/u.test(escape)) return String.fromCharCode(parseInt(escape.slice(1), 16));
        const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", "\\": "\\", "'": "'", '"': '"' };
        if (!Object.hasOwn(escapes, escape)) throw new Error("对白包含不支持的字符串转义");
        return escapes[escape];
      });
      return JSON.stringify(text);
    }
    if (/^[A-Za-z_$]/u.test(token)) {
      if (tokens[index + 1] === ":") return JSON.stringify(token);
      if (!["true", "false", "null"].includes(token)) throw new Error("对白不能包含表达式");
    }
    return token;
  }).join("");
  const result = JSON.parse(json);
  if (!Array.isArray(result)) throw new Error("对白必须是数组");
  return result;
}
