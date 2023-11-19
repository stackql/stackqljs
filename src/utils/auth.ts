//utils for auth formating
export function formatAuth(
  auth?: string | object,
) {
  try {
    if (auth) {
      let authObj: object;
      let authStr: string;
      console.log("typeof auth", typeof auth);
      if (typeof auth !== "object" && typeof auth !== "string") {
        throw new Error(
          "ERROR: [formatAuth] auth key supplied with invalid type",
        );
      }

      if (typeof auth === "string") {
        authObj = JSON.parse(auth);
        authStr = auth;
      } else {
        authObj = auth;
        authStr = JSON.stringify(auth);
      }

      return { authObj, authStr };
    } else {
      throw new Error(
        "ERROR: [formatAuth] auth key supplied with no value",
      );
    }
  } catch (e) {
    throw e;
  }
}
