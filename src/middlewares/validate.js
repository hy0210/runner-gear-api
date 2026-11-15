const AppError = require('../utils/app-error');

const SOURCES = ['params', 'query', 'body'];

// 以 zod schema 驗證 params / query / body。
// 通過後的結果放在 req.validated，controller 只從這裡取值：
// z.object 會丟棄 schema 沒定義的欄位，等同白名單。
function validate(schemas) {
  return function validateRequest(req, _res, next) {
    const validated = {};
    const errors = [];

    for (const source of SOURCES) {
      // eslint-disable-next-line security/detect-object-injection -- source 只會是上方固定的三個字串
      const schema = schemas[source];
      if (!schema) continue;

      // eslint-disable-next-line security/detect-object-injection
      const result = schema.safeParse(req[source] ?? {});
      if (result.success) {
        // eslint-disable-next-line security/detect-object-injection
        validated[source] = result.data;
      } else {
        for (const issue of result.error.issues) {
          errors.push({ field: issue.path.join('.') || source, message: issue.message });
        }
      }
    }

    if (errors.length > 0) {
      return next(new AppError(400, '輸入資料有誤', errors));
    }

    req.validated = validated;
    return next();
  };
}

module.exports = validate;
