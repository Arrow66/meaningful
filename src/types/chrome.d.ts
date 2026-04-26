declare namespace chrome {
  namespace runtime {
    function sendMessage<TResponse = unknown>(message: unknown): Promise<TResponse>;

    const onInstalled: {
      addListener(callback: () => void): void;
    };

    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ): void;
    };

    const onStartup: {
      addListener(callback: () => void): void;
    };
  }

  namespace storage {
    interface StorageChange {
      oldValue?: unknown;
      newValue?: unknown;
    }

    interface StorageArea {
      get<T = Record<string, unknown>>(
        keys?: string | string[] | Record<string, unknown> | null,
      ): Promise<T>;
      set(items: Record<string, unknown>): Promise<void>;
    }

    const local: StorageArea;

    const onChanged: {
      addListener(
        callback: (
          changes: Record<string, StorageChange>,
          areaName: 'local' | 'sync' | 'managed' | 'session',
        ) => void,
      ): void;
    };
  }

  namespace tabs {
    interface Tab {
      url?: string;
    }

    function query(queryInfo: {
      active?: boolean;
      currentWindow?: boolean;
    }): Promise<Tab[]>;
  }
}
