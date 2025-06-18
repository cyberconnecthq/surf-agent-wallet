/** @format */

const getBaseUrl = async () => {
  const { ENV } = await pollingTokens();
  return ENV === "production"
    ? "https://api.ask.surf/muninn/v1"
    : "https://api.stg.ask.surf/muninn/v1";
};

// Type definitions
interface SessionData {
  session_id: string;
  status: "INITIALIZING" | "RUNNING" | "TERMINATED";
  turnkey_public_key: string;
}

interface BaseApiResponse {
  message: string;
  success: boolean;
}

interface PollingApiResponse extends BaseApiResponse {
  data: SessionData;
}

interface TurnkeySubOrg {
  default_eth_addr: string;
  default_sol_addr: string;
  id: string;
  signer_user_tag_id: string;
}

interface XAccount {
  display_name: string;
  handle: string;
  id: string;
}

interface UserData {
  avatar_url: string;
  id: string;
  invitation_code: string;
  name: string;
  turnkey_sub_org: TurnkeySubOrg;
  x_account: XAccount;
}

interface UserApiResponse extends BaseApiResponse {
  data: UserData;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const patchPublicKeyBySessionId = async (params: {
  sessionId: string;
  publicKey: string;
  accessToken: string;
  maxRetries?: number;
}): Promise<BaseApiResponse> => {
  const { sessionId, publicKey, maxRetries = 3, accessToken } = params;
  let lastError: Error;
  const baseUrl = await getBaseUrl();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/sandbox/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ turnkey_public_key: publicKey }),
      });

      // If successful (2xx status), return the response
      if (response.ok) {
        return (await response.json()) as BaseApiResponse;
      }

      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new Error(
          `Client error: ${response.status} ${response.statusText}`
        );
      }

      // For server errors (5xx), we'll retry
      throw new Error(
        `Server error: ${response.status} ${response.statusText}`
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff: 1s, 2s, 4s, etc.
      const delay = 1000;
      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await sleep(delay);
    }
  }

  throw lastError!;
};

const pollingSessionStatus = async (params: {
  sessionId: string;
  accessToken: string;
  maxAttempts?: number;
  pollInterval?: number;
}): Promise<PollingApiResponse> => {
  const {
    sessionId,
    accessToken,
    maxAttempts = 600,
    pollInterval = 1500, // after 15 minutes, the access token will be expired
  } = params;
  let lastError: Error;

  const baseUrl = await getBaseUrl();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/sandbox/sessions/${sessionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data: PollingApiResponse = await response.json();

        // Check if the response has the expected structure
        if (data.success && data.data && data.data.status) {
          const status = data.data.status;

          // If status is RUNNING, we're done
          if (status === "RUNNING") {
            return data;
          }

          // Log current status and continue polling
          console.log(
            `Session ${sessionId} status: ${status}, continuing to poll...`
          );
        } else {
          throw new Error("Invalid response structure");
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Polling attempt ${attempt + 1} failed:`, lastError.message);

      // If this is the last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        throw new Error(
          `Polling failed after ${maxAttempts} attempts: ${lastError.message}`
        );
      }
    }

    // Wait before next poll
    await sleep(pollInterval);
  }

  throw new Error(
    `Session ${sessionId} did not reach RUNNING status after ${maxAttempts} attempts`
  );
};

const fetchMe = async (
  accessToken: string,
  maxRetries: number = 3
): Promise<UserApiResponse> => {
  let lastError: Error;
  const baseUrl = await getBaseUrl();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // If successful (2xx status), return the response
      if (response.ok) {
        return (await response.json()) as UserApiResponse;
      }

      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new Error(
          `Client error: ${response.status} ${response.statusText}`
        );
      }

      // For server errors (5xx), we'll retry
      throw new Error(
        `Server error: ${response.status} ${response.statusText}`
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff: 1s, 2s, 4s, etc.
      const delay = 1000;
      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await sleep(delay);
    }
  }

  throw lastError!;
};

async function fetchLocalStorage() {
  try {
    // 检查 browser.storage.managed 是否存在
    if (!browser.storage || !browser.storage.local) {
      console.error("❌ browser.storage.managed is not available");
      return;
    }

    console.log("✅ browser.storage.managed is available");

    // 尝试获取特定的 backendToken
    const USER_ACCESS_TOKEN = await browser.storage.local.get(
      "USER_ACCESS_TOKEN"
    );

    const SESSION_ID = await browser.storage.local.get("SESSION_ID");

    const ENV = await browser.storage.local.get("ENV");

    return {
      USER_ACCESS_TOKEN: USER_ACCESS_TOKEN.USER_ACCESS_TOKEN,
      SESSION_ID: SESSION_ID.SESSION_ID,
      ENV: ENV.ENV,
    };
  } catch (error) {
    console.error("❌ Error accessing managed storage:", error);
    console.error("❌ Error details:", (error as Error).message);
  }
}

// 从content script移过来的轮询函数，现在在background中运行
const pollingTokens = async () => {
  console.log("🔄 Starting token polling in background script...");

  let ACCESS_TOKEN = "";
  let SESSION_ID = "";
  let ENV = "";

  do {
    console.log("🔍 Polling tokens...");

    const result = await fetchLocalStorage();
    ACCESS_TOKEN = result?.USER_ACCESS_TOKEN;
    SESSION_ID = result?.SESSION_ID;
    ENV = result?.ENV;

    if (ACCESS_TOKEN && SESSION_ID) {
      console.log("✅ Tokens found! ACCESS_TOKEN and SESSION_ID are ready");
      // 可以在这里触发其他需要认证的初始化操作
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  } while (!ACCESS_TOKEN || !SESSION_ID || !ENV);

  return {
    ACCESS_TOKEN,
    SESSION_ID,
    ENV,
  };

  console.log("🎉 Token polling completed successfully");
};

export {
  fetchMe,
  patchPublicKeyBySessionId,
  pollingSessionStatus,
  pollingTokens,
};
export type {
  PollingApiResponse,
  SessionData,
  TurnkeySubOrg,
  UserApiResponse,
  UserData,
  XAccount,
};
