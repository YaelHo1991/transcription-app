declare global {
  interface Window {
    blockManagerRef?: {
      current: {
        getBlocks: () => any[];
        getText: () => string;
        getStatistics: () => any;
      };
    };
    speakerManagerRef?: {
      current: {
        getAllSpeakers: () => any[];
        addSpeaker: (code?: string, name?: string, description?: string) => any;
      };
    };
  }
}

export {};