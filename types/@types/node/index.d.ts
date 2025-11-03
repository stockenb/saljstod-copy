declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }

  interface Process {
    env: ProcessEnv;
    cwd(): string;
  }
}

declare var process: NodeJS.Process;

interface Buffer extends Uint8Array {
  toString(encoding?: string): string;
}

interface BufferConstructor {
  from(data: ArrayBuffer | ArrayBufferView): Buffer;
  from(data: string, encoding?: string): Buffer;
  alloc(size: number): Buffer;
}

declare var Buffer: BufferConstructor;

export {};
