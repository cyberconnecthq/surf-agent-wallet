/** @format */

/**
 * 生成安全的随机密码
 */
export function generatePassword(length: number = 16): string {
  // 定义字符集
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // 合并所有字符
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = "";

  // 确保包含每种类型的字符至少一个
  password += getRandomChar(uppercase); // 至少一个大写字母
  password += getRandomChar(lowercase); // 至少一个小写字母
  password += getRandomChar(numbers); // 至少一个数字
  password += getRandomChar(symbols); // 至少一个符号

  // 生成剩余的随机字符
  for (let i = 4; i < length; i++) {
    password += getRandomChar(allChars);
  }

  // 随机打乱字符顺序
  return shuffleString(password);
}

/**
 * 从字符集中随机选择一个字符
 */
function getRandomChar(charset: string): string {
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const randomIndex = randomArray[0] % charset.length;
  return charset[randomIndex];
}

/**
 * 随机打乱字符串
 */
function shuffleString(str: string): string {
  const array = str.split("");

  for (let i = array.length - 1; i > 0; i--) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array.join("");
}

export const PASSWORD = generatePassword();
