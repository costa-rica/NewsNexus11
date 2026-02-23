export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("./lib/logger");

    console.log("Initializing Server-Side Logging...");
    console.log("Environment Debug:", {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_MODE: process.env.NEXT_PUBLIC_MODE,
      NEXT_PUBLIC_PATH_TO_LOGS: process.env.NEXT_PUBLIC_PATH_TO_LOGS,
    });

    // Monkey-patch global console methods to use our logger
    // We store original methods to avoid infinite loops if needed,
    // but here we just overwrite them for the specific levels.

    // Note: We need to be careful not to break Next.js internal logging
    // providing a safeguard or only patching specific methods is wise.
    // For this requirement, we will redirect standard methods.

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    const originalConsoleDebug = console.debug;

    global.console.log = (...args: any[]) => {
      logger.info(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")
      );
    };

    global.console.error = (...args: any[]) => {
      logger.error(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")
      );
    };

    global.console.warn = (...args: any[]) => {
      logger.warn(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")
      );
    };

    global.console.info = (...args: any[]) => {
      logger.info(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")
      );
    };

    global.console.debug = (...args: any[]) => {
      logger.debug(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")
      );
    };

    logger.info("Logging system initialized via instrumentation hook");
  }
}
