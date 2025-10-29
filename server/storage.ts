// Storage interface for inventory data
// modify the interface with any CRUD methods you might need

export interface IStorage {
  // Add inventory-related methods here if needed
}

export class MemStorage implements IStorage {
  constructor() {
    // Initialize storage as needed
  }
}

export const storage = new MemStorage();
