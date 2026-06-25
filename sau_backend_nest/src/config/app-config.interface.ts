export interface AppConfig {
  baseDir: string;
  localChromePath: string;
  localChromeHeadless: boolean;
  debugMode: boolean;
  port: number;
  redisUrl: string;
  mongodbUrl: string;
  xhsServer: string;
}
