import type { DefinitionResult } from '../shared/definitions';

type TooltipState = 'loading' | 'result' | 'error';

export class DefinitionTooltip {
  private readonly host: HTMLDivElement;
  private readonly root: ShadowRoot;
  private sourceUrl: string | undefined;

  constructor() {
    this.host = document.createElement('div');
    this.host.id = 'meaningful-definition-tooltip';
    this.host.style.position = 'fixed';
    this.host.style.zIndex = '2147483647';
    this.host.style.display = 'none';

    this.root = this.host.attachShadow({ mode: 'open' });
    document.documentElement.append(this.host);

    this.host.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
  }

  showLoading(word: string, anchorRect: DOMRect): void {
    this.sourceUrl = undefined;
    this.render('loading', {
      word,
      definition: 'Looking up definition...',
      provider: 'Meaningful',
    });
    this.position(anchorRect);
  }

  showResult(result: DefinitionResult, anchorRect: DOMRect): void {
    this.sourceUrl = result.sourceUrl;
    this.render('result', result);
    this.position(anchorRect);
  }

  showError(word: string, anchorRect: DOMRect): void {
    this.sourceUrl = `https://www.google.com/search?q=${encodeURIComponent(`define ${word}`)}`;
    this.render('error', {
      word,
      definition: 'Definition unavailable. You can still search for more detail.',
      provider: 'Meaningful',
    });
    this.position(anchorRect);
  }

  hide(): void {
    if (this.host.style.display === 'none') {
      return;
    }

    this.host.style.display = 'none';
  }

  isVisible(): boolean {
    return this.host.style.display !== 'none';
  }

  private render(state: TooltipState, result: DefinitionResult): void {
    this.root.innerHTML = '';
    this.root.append(createTooltipStyles());

    const card = document.createElement('section');
    card.className = 'card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-live', 'polite');

    const closeButton = document.createElement('button');
    closeButton.className = 'close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close definition');
    closeButton.textContent = 'x';
    closeButton.addEventListener('click', () => this.hide());

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = result.word;

    const phonetic = document.createElement('div');
    phonetic.className = 'phonetic';
    phonetic.textContent = result.phonetic ?? result.provider;

    const definition = document.createElement('p');
    definition.className = state === 'error' ? 'definition error' : 'definition';
    definition.textContent = result.definition;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const learnMoreButton = document.createElement('button');
    learnMoreButton.className = 'learn-more';
    learnMoreButton.type = 'button';
    learnMoreButton.textContent = 'Learn more';
    learnMoreButton.disabled = state === 'loading';
    learnMoreButton.addEventListener('click', () => {
      if (this.sourceUrl) {
        window.open(this.sourceUrl, '_blank', 'noopener,noreferrer');
      }
    });

    actions.append(learnMoreButton);
    card.append(closeButton, title, phonetic, definition);

    if (result.example) {
      const example = document.createElement('p');
      example.className = 'example';
      example.textContent = `"${result.example}"`;
      card.append(example);
    }

    card.append(actions);
    this.root.append(card);
  }

  private position(anchorRect: DOMRect): void {
    const margin = 10;
    const top = Math.max(
      margin,
      Math.min(anchorRect.bottom + margin, window.innerHeight - 160),
    );
    const left = Math.max(
      margin,
      Math.min(anchorRect.left, window.innerWidth - 330),
    );

    this.host.style.top = `${top}px`;
    this.host.style.left = `${left}px`;
    this.host.style.display = 'block';
  }
}

function createTooltipStyles(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
    .card {
      box-sizing: border-box;
      width: min(320px, calc(100vw - 20px));
      padding: 14px 16px 12px;
      border: 1px solid rgba(15, 23, 42, 0.14);
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22);
      color: #111827;
      font: 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .close {
      position: absolute;
      top: 8px;
      right: 10px;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }

    .close:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .title {
      max-width: 250px;
      color: #0f172a;
      font-size: 17px;
      font-weight: 700;
      text-transform: capitalize;
    }

    .phonetic {
      margin-top: 2px;
      color: #64748b;
      font-size: 12px;
    }

    .definition {
      margin: 10px 0 0;
    }

    .definition.error {
      color: #9f1239;
    }

    .example {
      margin: 8px 0 0;
      color: #475569;
      font-size: 13px;
      font-style: italic;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .learn-more {
      border: 0;
      border-radius: 999px;
      background: #2563eb;
      color: #ffffff;
      cursor: pointer;
      font-weight: 650;
      padding: 7px 12px;
    }

    .learn-more:disabled {
      cursor: wait;
      opacity: 0.65;
    }
  `;

  return style;
}
