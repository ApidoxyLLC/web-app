import mongoose from "mongoose";

class DatabaseManager {
  constructor(uri) {
    this.connection = mongoose.createConnection();
    this.uri = uri;
  }

  async connect() {
    await this.connection.openUri(this.uri);
    console.log(`Connected to ${this.uri}`);
    return this.connection;
  }

  async disconnect() {
    await this.connection.close();
    console.log(`Disconnected from ${this.uri}`);
  }

  getModel(name, schema) {
    return this.connection.model(name, schema);
  }
}

export default DatabaseManager