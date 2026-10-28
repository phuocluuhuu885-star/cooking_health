class ConfigClass {
  env: string = "DEV";
  baseUrl: string = "http://192.168.5.20:8000/";
  auth: string = "Basic bWV0cm9obkd1ZXN0OjEyMzQ1NkBtZXRyTw==";
  baseCheckLoginKey: string = "metrohn_secret_key_2025_a12b0f4de999";

  logBaseUrl: string = "http://192.168.5.20:8000";
  apiToken: string = "295D82F890D14672AE4583C8087FC85D19B266D02D286A6DA4ABEE603F8A2C67875F763623F";
  logAuth: string = "Bearer ";
  apiAuth: string = "D463B90300114359A0443A569578AF4D";

  baseDCApi: string = "http://192.168.5.20:8000/";

  switchToDev() {
    this.env = "DEV";
    this.baseUrl = "http://192.168.5.20:8000/";
    this.auth = "Basic bWV0cm9obkd1ZXN0OjEyMzQ1NkBtZXRyTw==";
    this.baseCheckLoginKey = "metrohn_secret_key_2025_a12b0f4de999";
  }

  switchToPro() {

  }
}

const configs = new ConfigClass();

export default configs;

export const CODE_PUSH_VERSION = '0';
export const APP_ID = 'hnmetro';
export const CODE_PUSH_CHECK_API_KEY = 'eP5koM0upz4cxPMoepCAQcmoiT4G7qvb';