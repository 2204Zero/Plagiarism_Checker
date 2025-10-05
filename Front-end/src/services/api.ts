const API_BASE_URL = 'http://localhost:8000';

export interface PlagiarismCheckResult {
  overallScore: number;
  localScore: number;
  aiScore: number;
  webScore: number;
  webSources: Array<{
    title: string;
    url: string;
    score: number;
  }>;
  highlights: Array<{
    start: number;
    end: number;
    source: string;
    score: number;
    textA?: string;
    textB?: string;
    lineA?: number;
    lineB?: number;
    matchType?: string;
  }>;
  localHighlights?: Array<{
    start: number;
    end: number;
    source: string;
    score: number;
    textA?: string;
    textB?: string;
    lineA?: number;
    lineB?: number;
    matchType?: string;
  }>;
  aiHighlights?: Array<{
    start: number;
    end: number;
    source: string;
    score: number;
    textA?: string;
    textB?: string;
    lineA?: number;
    lineB?: number;
    matchType?: string;
  }>;
  webHighlights?: Array<{
    start: number;
    end: number;
    source: string;
    score: number;
    textA?: string;
    textB?: string;
    lineA?: number;
    lineB?: number;
    matchType?: string;
  }>;
  mode?: string;
}

export interface PlagiarismCheckRequest {
  mode: 'local';
  fileA: File;
  fileB: File;
}

export class PlagiarismAPI {
  static async checkPlagiarism(request: PlagiarismCheckRequest): Promise<PlagiarismCheckResult> {
    const formData = new FormData();
    formData.append('mode', request.mode);
    
    if (request.fileA) {
      formData.append('fileA', request.fileA);
    }
    
    if (request.fileB) {
      formData.append('fileB', request.fileB);
    }
    
    if (request.textB) {
      formData.append('textB', request.textB);
    }

    const response = await fetch(`${API_BASE_URL}/check`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check plagiarism');
    }

    return response.json();
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/docs`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

