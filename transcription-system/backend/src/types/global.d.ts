declare global {
  var downloadBatches: {
    [batchId: string]: {
      batchId: string;
      status: 'downloading' | 'completed' | 'failed';
      projectId: string | null;
      projectName: string;
      totalFiles: number;
      completedFiles: number;
      progress: {
        [mediaIndex: number]: {
          progress: number;
          status: 'downloading' | 'completed' | 'failed';
          error?: string;
        };
      };
      mediaNames: {
        [mediaIndex: number]: string;
      };
      createdAt: string;
    };
  };
}

export {};