const fs = require('fs');
const CryptoJS = require('crypto-js');

class EncryptedJSONFile {
  constructor(filename, secret) {
    this.filename = filename;
    this.secret = secret;
  }

  async read() {
    try {
      if (!fs.existsSync(this.filename)) return null;
      const encrypted = fs.readFileSync(this.filename, 'utf8');
      const bytes = CryptoJS.AES.decrypt(encrypted, this.secret);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch (e) {
      return null;
    }
  }

  async write(obj) {
    const data = JSON.stringify(obj, null, 2);
    const encrypted = CryptoJS.AES.encrypt(data, this.secret).toString();
    fs.writeFileSync(this.filename, encrypted, 'utf8');
  }
}

module.exports = { EncryptedJSONFile };