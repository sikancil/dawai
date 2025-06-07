// This file will contain the Server class, which will be responsible for
// handling HTTP requests and responses.

import http from 'http';

export class Server {
  private server: http.Server;

  constructor() {
    this.server = http.createServer((req, res) => {
      // Handle incoming requests here
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello, World!');
    });
  }

  public start(port: number = 3000): void {
    this.server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }

  public stop(callback?: () => void): void {
    this.server.close(callback);
  }
}
