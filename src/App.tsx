import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent, FormEvent } from 'react';
import { DEFAULT_BOARDS, THEMES, createId, getTheme } from './data';
import { imageFileToOptimizedDataUrl } from './imageTools';
import {
  BoardIcon,
  DownloadIcon,
  DragHandleIcon,
  EditIcon,
  ImageIcon,
  ImportIcon,
  LinkIcon,
  LockIcon,
  PaletteIcon,
  PlusIcon,
  QuoteIcon,
  SortIcon,
  SparkleIcon,
  StarIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from './icons';
import { normalizeBoards, readBoards, resetBoards, saveBoards } from './storage';
import type { AddPinDraft, Board, Pin, PinSortMode, PinType, ThemeId } from './types';
import './styles.css';

const pinOptions: Array<{ type: PinType; label: string; description: string }> = [
  { type: 'image-url', label: 'Image URL', description: 'Paste a direct web image link.' },
  { type: 'upload', label: 'Upload', description: 'Save an image from this device.' },
  { type: 'quote', label: 'Quote', description: 'Add an affirmation or mantra.' },
  { type: 'link', label: 'Link', description: 'Save a clickable URL.' },
];

const pinSortOptions: Array<{ mode: PinSortMode; label: string; description: string }> = [
  { mode: 'manual', label: 'Manual arrangement', description: 'Drag and drop pins into your own order.' },
  { mode: 'created-desc', label: 'Newest created first', description: 'Show recently added pins first.' },
  { mode: 'created-asc', label: 'Oldest created first', description: 'Show earliest pins first.' },
  { mode: 'updated-desc', label: 'Recently edited first', description: 'Show pins with the latest changes first.' },
  { mode: 'updated-asc', label: 'Least recently edited first', description: 'Show pins with older changes first.' },
];

const pinIcon = (type: PinType) => {
  if (type === 'image-url') return <ImageIcon />;
  if (type === 'upload') return <UploadIcon />;
  if (type === 'quote') return <QuoteIcon />;
  return <LinkIcon />;
};

const normalizeUrl = (rawValue: string, label = 'URL') => {
  const trimmed = rawValue.trim();
  if (!trimmed) throw new Error(`${label} is required.`);

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;

  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error(`Please enter a valid ${label.toLowerCase()}.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must start with http:// or https://.`);
  }

  return parsed.href;
};

const formatHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const boardStyle = (themeId: ThemeId): CSSProperties => {
  const theme = getTheme(themeId);
  return {
    '--theme-a': theme.accentA,
    '--theme-b': theme.accentB,
    '--theme-glow': theme.glow,
    '--theme-contrast': theme.contrast,
  } as CSSProperties;
};

const isThemeId = (value: string): value is ThemeId =>
  THEMES.some((theme) => theme.id === value);

const selectThemeId = (value: string): ThemeId => (isThemeId(value) ? value : 'aurora');

const selectPinSortMode = (value: string): PinSortMode =>
  pinSortOptions.some((option) => option.mode === value) ? (value as PinSortMode) : 'manual';

const pinTypeLabel = (type: PinType) => pinOptions.find((option) => option.type === type)?.label ?? type;

const pinSortLabel = (mode: PinSortMode) =>
  pinSortOptions.find((option) => option.mode === mode)?.label ?? 'Manual arrangement';

const getTime = (value: string) => {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
};

const getSortedPins = (pins: Pin[], sortMode: PinSortMode) => {
  const key: 'createdAt' | 'updatedAt' = sortMode.startsWith('created') ? 'createdAt' : 'updatedAt';
  const direction = sortMode.endsWith('asc') ? 'asc' : 'desc';

  return pins
    .map((pin, index) => ({ pin, index }))
    .sort((left, right) => {
      const starDifference = Number(Boolean(right.pin.isStarred)) - Number(Boolean(left.pin.isStarred));
      if (starDifference) return starDifference;

      if (sortMode === 'manual') {
        return left.index - right.index;
      }

      const leftTime = getTime(left.pin[key]);
      const rightTime = getTime(right.pin[key]);
      const dateDifference = direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;

      return dateDifference || left.index - right.index;
    })
    .map(({ pin }) => pin);
};

const movePinByIds = (
  pins: Pin[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after',
) => {
  if (sourceId === targetId) return pins;

  const source = pins.find((pin) => pin.id === sourceId);
  if (!source) return pins;

  const withoutSource = pins.filter((pin) => pin.id !== sourceId);
  const targetIndex = withoutSource.findIndex((pin) => pin.id === targetId);
  if (targetIndex === -1) return pins;

  const insertIndex = targetIndex + (position === 'after' ? 1 : 0);
  const nextPins = [...withoutSource];
  nextPins.splice(insertIndex, 0, source);
  return nextPins;
};

const sortBoards = (boards: Board[]) =>
  boards
    .map((board, index) => ({ board, index }))
    .sort((left, right) => {
      const starDifference = Number(Boolean(right.board.isStarred)) - Number(Boolean(left.board.isStarred));
      return starDifference || left.index - right.index;
    })
    .map(({ board }) => board);

const buildPinFromDraft = (draft: AddPinDraft, existingPin?: Pin): Pin => {
  const timestamp = new Date().toISOString();
  const base = {
    id: existingPin?.id ?? createId('pin'),
    caption: draft.caption.trim() || undefined,
    createdAt: existingPin?.createdAt ?? timestamp,
    updatedAt: timestamp,
    isStarred: existingPin?.isStarred ?? false,
  };

  if (draft.type === 'image-url') {
    return {
      ...base,
      type: 'image-url',
      imageUrl: normalizeUrl(draft.imageUrl, 'Image URL'),
      alt: draft.alt.trim() || undefined,
    };
  }

  if (draft.type === 'upload') {
    if (!draft.imageData) throw new Error('Choose an image to upload.');

    return {
      ...base,
      type: 'upload',
      imageData: draft.imageData,
      fileName: draft.fileName.trim() || undefined,
      alt: draft.alt.trim() || undefined,
    };
  }

  if (draft.type === 'quote') {
    const quote = draft.quote.trim();
    if (!quote) throw new Error('Quote text is required.');

    return {
      ...base,
      type: 'quote',
      quote,
      author: draft.author.trim() || undefined,
      themeId: draft.themeId,
    };
  }

  const url = normalizeUrl(draft.url, 'Link URL');
  const previewImage = draft.previewImage.trim();

  return {
    ...base,
    type: 'link',
    url,
    title: draft.title.trim() || formatHostname(url),
    previewImage: previewImage ? normalizeUrl(previewImage, 'Preview image URL') : undefined,
  };
};

function App() {
  const [boards, setBoards] = useState<Board[]>(() => readBoards());
  const [activeBoardId, setActiveBoardId] = useState('board-vision');
  const [isAddPinOpen, setIsAddPinOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<Pin | null>(null);
  const [isNewBoardOpen, setIsNewBoardOpen] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'error'>('saved');
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [dragOverPin, setDragOverPin] = useState<{ pinId: string; position: 'before' | 'after' } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const sortedBoards = useMemo(() => sortBoards(boards), [boards]);

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? sortedBoards[0] ?? boards[0],
    [activeBoardId, boards, sortedBoards],
  );

  const activePins = useMemo(
    () => getSortedPins(activeBoard?.pins ?? [], activeBoard?.pinSortMode ?? 'manual'),
    [activeBoard?.pins, activeBoard?.pinSortMode],
  );

  const totalPins = boards.reduce((sum, board) => sum + board.pins.length, 0);
  const starredPinCount = activeBoard.pins.filter((pin) => pin.isStarred).length;
  const isManualSorting = activeBoard.pinSortMode === 'manual';

  useEffect(() => {
    if (!activeBoard && sortedBoards[0]) {
      setActiveBoardId(sortedBoards[0].id);
      return;
    }

    if (activeBoard && activeBoard.id !== activeBoardId) {
      setActiveBoardId(activeBoard.id);
    }
  }, [activeBoard, activeBoardId, sortedBoards]);

  useEffect(() => {
    try {
      saveBoards(boards);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [boards]);

  const updateBoard = (boardId: string, updater: (board: Board) => Board) => {
    setBoards((currentBoards) =>
      currentBoards.map((board) => (board.id === boardId ? updater(board) : board)),
    );
  };

  const handleAddPin = (draft: AddPinDraft) => {
    if (!activeBoard) return;

    const newPin = buildPinFromDraft(draft);

    updateBoard(activeBoard.id, (board) => ({
      ...board,
      updatedAt: new Date().toISOString(),
      pins: [...board.pins, newPin],
    }));
  };

  const handleUpdatePin = (pinId: string, draft: AddPinDraft) => {
    if (!activeBoard) return;

    const currentPin = activeBoard.pins.find((pin) => pin.id === pinId);
    if (!currentPin) throw new Error('Could not find that pin.');

    const updatedPin = buildPinFromDraft(draft, currentPin);

    updateBoard(activeBoard.id, (board) => ({
      ...board,
      updatedAt: new Date().toISOString(),
      pins: board.pins.map((pin) => (pin.id === pinId ? updatedPin : pin)),
    }));
  };

  const handleTogglePinStar = (pinId: string) => {
    if (!activeBoard) return;

    const timestamp = new Date().toISOString();

    updateBoard(activeBoard.id, (board) => ({
      ...board,
      updatedAt: timestamp,
      pins: board.pins.map((pin) =>
        pin.id === pinId ? { ...pin, isStarred: !pin.isStarred, updatedAt: timestamp } : pin,
      ),
    }));
  };

  const handleDeletePin = (pinId: string) => {
    if (!activeBoard) return;

    updateBoard(activeBoard.id, (board) => ({
      ...board,
      updatedAt: new Date().toISOString(),
      pins: board.pins.filter((pin) => pin.id !== pinId),
    }));
  };

  const handleCreateBoard = (name: string, themeId: ThemeId) => {
    const now = new Date().toISOString();
    const board: Board = {
      id: createId('board'),
      name: name.trim() || 'Untitled board',
      themeId,
      pins: [],
      isStarred: false,
      pinSortMode: 'manual',
      createdAt: now,
      updatedAt: now,
    };

    setBoards((currentBoards) => [board, ...currentBoards]);
    setActiveBoardId(board.id);
  };

  const handleUpdateBoardTheme = (themeId: ThemeId) => {
    if (!activeBoard) return;

    updateBoard(activeBoard.id, (board) => ({
      ...board,
      themeId,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdatePinSort = (pinSortMode: PinSortMode) => {
    if (!activeBoard) return;

    setDraggingPinId(null);
    setDragOverPin(null);
    updateBoard(activeBoard.id, (board) => ({
      ...board,
      pinSortMode,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleBoardStar = (boardId: string) => {
    updateBoard(boardId, (board) => ({
      ...board,
      isStarred: !board.isStarred,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handlePinDragStart = (pinId: string, event: DragEvent<HTMLElement>) => {
    if (!isManualSorting) return;

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pinId);
    setDraggingPinId(pinId);
  };

  const handlePinDragOver = (pinId: string, event: DragEvent<HTMLElement>) => {
    if (!isManualSorting || !draggingPinId || draggingPinId === pinId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before';

    setDragOverPin((current) =>
      current?.pinId === pinId && current.position === position ? current : { pinId, position },
    );
  };

  const handlePinDrop = (targetId: string, event: DragEvent<HTMLElement>) => {
    if (!isManualSorting || !draggingPinId || !activeBoard) return;

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const position = dragOverPin?.pinId === targetId
      ? dragOverPin.position
      : event.clientY > rect.top + rect.height / 2
        ? 'after'
        : 'before';

    updateBoard(activeBoard.id, (board) => {
      const displayPins = getSortedPins(board.pins, 'manual');
      const reorderedPins = movePinByIds(displayPins, draggingPinId, targetId, position);

      return {
        ...board,
        pins: reorderedPins,
        updatedAt: new Date().toISOString(),
      };
    });

    setDraggingPinId(null);
    setDragOverPin(null);
  };

  const handlePinDragEnd = () => {
    setDraggingPinId(null);
    setDragOverPin(null);
  };

  const handleDeleteBoard = () => {
    if (!activeBoard || boards.length <= 1) return;

    const shouldDelete = window.confirm(`Delete "${activeBoard.name}" and all of its pins?`);
    if (!shouldDelete) return;

    setBoards((currentBoards) => currentBoards.filter((board) => board.id !== activeBoard.id));
  };

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(boards, null, 2)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `glass-vision-board-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const importedBoards = normalizeBoards(parsed);

      if (!importedBoards) {
        window.alert('That file does not look like a Glass Vision Board export.');
        return;
      }

      const shouldReplace = window.confirm('Importing will replace the boards saved in this browser. Continue?');
      if (!shouldReplace) return;

      setBoards(importedBoards);
      setActiveBoardId(sortBoards(importedBoards)[0].id);
    } catch {
      window.alert('Could not import that JSON file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRestoreStarters = () => {
    const shouldRestore = window.confirm('Restore the starter boards? This replaces the boards saved in this browser.');
    if (!shouldRestore) return;

    resetBoards();
    setBoards(DEFAULT_BOARDS);
    setActiveBoardId(DEFAULT_BOARDS[0].id);
  };

  if (!activeBoard) {
    return null;
  }

  return (
    <main className="app-shell" style={boardStyle(activeBoard.themeId)}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <Sidebar
        boards={sortedBoards}
        activeBoardId={activeBoard.id}
        onSelectBoard={setActiveBoardId}
        onToggleBoardStar={handleToggleBoardStar}
        onNewBoard={() => setIsNewBoardOpen(true)}
        onExport={handleExport}
        onImport={() => importInputRef.current?.click()}
        onRestoreStarters={handleRestoreStarters}
      />

      <section className="workspace" aria-label={`${activeBoard.name} board`}>
        <header className="hero glass-panel">
          <div className="hero-copy">
            <span className="eyebrow">
              <SparkleIcon />
              Local-first mood board
            </span>
            <h1>{activeBoard.name}</h1>
            <p>
              Collect images, uploads, affirmations, and link previews in a private board that saves in this browser.
            </p>
            <div className="status-row" aria-live="polite">
              <span className="status-pill success">
                <LockIcon />
                {saveState === 'saved' ? 'Saved locally' : 'Storage needs attention'}
              </span>
              <span className="status-pill">
                <BoardIcon />
                {boards.length} {boards.length === 1 ? 'board' : 'boards'} - {totalPins} {totalPins === 1 ? 'pin' : 'pins'}
              </span>
            </div>
            {saveState === 'error' ? (
              <p className="storage-warning">
                Your browser storage may be full. Export a backup, then remove large uploaded images.
              </p>
            ) : null}
          </div>

          <div className="hero-actions">
            <ThemeSelect
              id="active-board-theme"
              label="Board theme"
              value={activeBoard.themeId}
              onChange={handleUpdateBoardTheme}
              compact
            />
            <button
              className={`ghost-button star-toggle ${activeBoard.isStarred ? 'active' : ''}`}
              type="button"
              onClick={() => handleToggleBoardStar(activeBoard.id)}
              aria-pressed={Boolean(activeBoard.isStarred)}
            >
              <StarIcon />
              {activeBoard.isStarred ? 'Important' : 'Mark important'}
            </button>
            <button className="primary-button" type="button" onClick={() => setIsAddPinOpen(true)}>
              <PlusIcon />
              Add pin
            </button>
            <button
              className="ghost-button danger-subtle"
              type="button"
              onClick={handleDeleteBoard}
              disabled={boards.length <= 1}
              title={boards.length <= 1 ? 'Keep at least one board' : 'Delete board'}
            >
              <TrashIcon />
              Delete board
            </button>
          </div>
        </header>

        {activeBoard.pins.length > 0 ? (
          <>
            <PinToolbar
              sortMode={activeBoard.pinSortMode}
              pinCount={activeBoard.pins.length}
              starredCount={starredPinCount}
              onSortChange={handleUpdatePinSort}
            />

            <section className={`pin-grid ${isManualSorting ? 'manual-sorting' : ''}`} aria-label="Pins">
              {activePins.map((pin) => (
                <PinCard
                  key={pin.id}
                  pin={pin}
                  boardThemeId={activeBoard.themeId}
                  isManualSorting={isManualSorting}
                  isDragging={draggingPinId === pin.id}
                  dropPosition={dragOverPin?.pinId === pin.id ? dragOverPin.position : null}
                  onEdit={setEditingPin}
                  onDelete={handleDeletePin}
                  onToggleStar={handleTogglePinStar}
                  onDragStart={handlePinDragStart}
                  onDragOver={handlePinDragOver}
                  onDrop={handlePinDrop}
                  onDragEnd={handlePinDragEnd}
                />
              ))}
            </section>
          </>
        ) : (
          <EmptyBoard onAddPin={() => setIsAddPinOpen(true)} />
        )}
      </section>

      <input
        ref={importInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
      />

      {isAddPinOpen ? (
        <PinModal activeThemeId={activeBoard.themeId} onSave={handleAddPin} onClose={() => setIsAddPinOpen(false)} />
      ) : null}

      {editingPin ? (
        <PinModal
          activeThemeId={activeBoard.themeId}
          initialPin={editingPin}
          onSave={(draft) => {
            handleUpdatePin(editingPin.id, draft);
            setEditingPin(null);
          }}
          onClose={() => setEditingPin(null)}
        />
      ) : null}

      {isNewBoardOpen ? <NewBoardModal onCreate={handleCreateBoard} onClose={() => setIsNewBoardOpen(false)} /> : null}
    </main>
  );
}

interface SidebarProps {
  boards: Board[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onToggleBoardStar: (boardId: string) => void;
  onNewBoard: () => void;
  onExport: () => void;
  onImport: () => void;
  onRestoreStarters: () => void;
}

function Sidebar({
  boards,
  activeBoardId,
  onSelectBoard,
  onToggleBoardStar,
  onNewBoard,
  onExport,
  onImport,
  onRestoreStarters,
}: SidebarProps) {
  return (
    <aside className="sidebar glass-panel" aria-label="Boards">
      <div className="brand">
        <div className="brand-mark">
          <SparkleIcon />
        </div>
        <div>
          <strong>Glass Boards</strong>
          <span>Vision + mood</span>
        </div>
      </div>

      <button className="primary-button full" type="button" onClick={onNewBoard}>
        <PlusIcon />
        New board
      </button>

      <nav className="board-list" aria-label="Board list">
        {boards.map((board) => {
          const theme = getTheme(board.themeId);
          const isActive = board.id === activeBoardId;

          return (
            <div key={board.id} className={`board-row ${isActive ? 'active' : ''}`} style={boardStyle(board.themeId)}>
              <button
                className="board-item"
                type="button"
                onClick={() => onSelectBoard(board.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="board-swatch" aria-hidden="true" />
                <span className="board-text">
                  <strong>{board.name}</strong>
                  <span>
                    {board.isStarred ? 'Important - ' : ''}{theme.name} - {board.pins.length} {board.pins.length === 1 ? 'pin' : 'pins'}
                  </span>
                </span>
              </button>
              <button
                className={`board-star-button ${board.isStarred ? 'active' : ''}`}
                type="button"
                onClick={() => onToggleBoardStar(board.id)}
                aria-label={board.isStarred ? `Unmark ${board.name} as important` : `Mark ${board.name} as important`}
                aria-pressed={Boolean(board.isStarred)}
                title={board.isStarred ? 'Important board' : 'Mark important'}
              >
                <StarIcon />
              </button>
            </div>
          );
        })}
      </nav>

      <details className="data-card">
        <summary>
          <span className="data-summary-icon" aria-hidden="true">
            <LockIcon />
          </span>
          <span>
            <strong>Your data stays local</strong>
            <small>Backup tools</small>
          </span>
        </summary>
        <p>Back up or move boards with JSON export/import.</p>
        <div className="data-actions">
          <button className="ghost-button" type="button" onClick={onExport}>
            <DownloadIcon />
            Export
          </button>
          <button className="ghost-button" type="button" onClick={onImport}>
            <ImportIcon />
            Import
          </button>
        </div>
        <button className="text-button" type="button" onClick={onRestoreStarters}>
          Restore starter boards
        </button>
      </details>
    </aside>
  );
}

interface PinToolbarProps {
  sortMode: PinSortMode;
  pinCount: number;
  starredCount: number;
  onSortChange: (mode: PinSortMode) => void;
}

function PinToolbar({ sortMode, pinCount, starredCount, onSortChange }: PinToolbarProps) {
  const selectedOption = pinSortOptions.find((option) => option.mode === sortMode) ?? pinSortOptions[0];

  return (
    <section className="pin-toolbar glass-panel" aria-label="Pin sorting controls">
      <div className="pin-toolbar-copy">
        <span className="eyebrow">
          <SortIcon />
          Pin order
        </span>
        <strong>{selectedOption.label}</strong>
        <p>{sortMode === 'manual' ? 'Drag cards to arrange them. Starred pins always stay above the rest.' : selectedOption.description}</p>
      </div>

      <div className="pin-toolbar-controls">
        <label className="sort-select" htmlFor="pin-sort-mode">
          <span>Sort pins</span>
          <select
            id="pin-sort-mode"
            value={sortMode}
            onChange={(event) => onSortChange(selectPinSortMode(event.target.value))}
          >
            {pinSortOptions.map((option) => (
              <option key={option.mode} value={option.mode}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="toolbar-stat">
          <StarIcon />
          {starredCount} starred / {pinCount} total
        </span>
      </div>
    </section>
  );
}

interface PinCardProps {
  pin: Pin;
  boardThemeId: ThemeId;
  isManualSorting: boolean;
  isDragging: boolean;
  dropPosition: 'before' | 'after' | null;
  onEdit: (pin: Pin) => void;
  onDelete: (pinId: string) => void;
  onToggleStar: (pinId: string) => void;
  onDragStart: (pinId: string, event: DragEvent<HTMLElement>) => void;
  onDragOver: (pinId: string, event: DragEvent<HTMLElement>) => void;
  onDrop: (pinId: string, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}

function PinCard({
  pin,
  boardThemeId,
  isManualSorting,
  isDragging,
  dropPosition,
  onEdit,
  onDelete,
  onToggleStar,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: PinCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const quoteTheme = pin.type === 'quote' ? getTheme(pin.themeId) : getTheme(boardThemeId);
  const contentStyle = {
    '--pin-a': quoteTheme.accentA,
    '--pin-b': quoteTheme.accentB,
    '--pin-contrast': quoteTheme.contrast,
  } as CSSProperties;

  const syncMasonrySpan = useCallback(() => {
    const card = cardRef.current;
    const grid = card?.parentElement;
    if (!card || !grid) return;

    const gridStyles = window.getComputedStyle(grid);
    const rowHeight = Number.parseInt(gridStyles.getPropertyValue('grid-auto-rows'), 10) || 8;
    const rowGap = Number.parseInt(gridStyles.getPropertyValue('row-gap'), 10) || 16;
    const cardHeight = card.getBoundingClientRect().height;
    const span = Math.max(1, Math.ceil((cardHeight + rowGap) / (rowHeight + rowGap)));

    card.style.setProperty('--row-span', span.toString());
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    syncMasonrySpan();

    const resizeObserver = new ResizeObserver(syncMasonrySpan);
    resizeObserver.observe(card);
    window.addEventListener('resize', syncMasonrySpan);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncMasonrySpan);
    };
  }, [pin, syncMasonrySpan]);

  const handleMediaLoaded = () => {
    window.requestAnimationFrame(syncMasonrySpan);
  };

  return (
    <article
      ref={cardRef}
      className={`pin-card pin-card-${pin.type} ${pin.isStarred ? 'starred' : ''} ${isManualSorting ? 'draggable' : ''} ${isDragging ? 'dragging' : ''} ${dropPosition ? `drop-${dropPosition}` : ''}`}
      style={contentStyle}
      draggable={isManualSorting}
      onDragStart={(event) => onDragStart(pin.id, event)}
      onDragOver={(event) => onDragOver(pin.id, event)}
      onDrop={(event) => onDrop(pin.id, event)}
      onDragEnd={onDragEnd}
    >
      <div className="pin-actions">
        {isManualSorting ? (
          <span className="pin-drag-handle" title="Drag to arrange" aria-label="Drag to arrange">
            <DragHandleIcon />
          </span>
        ) : null}
        <button
          className={`pin-action star ${pin.isStarred ? 'active' : ''}`}
          type="button"
          onClick={() => onToggleStar(pin.id)}
          aria-label={pin.isStarred ? 'Unstar pin' : 'Star pin'}
          aria-pressed={Boolean(pin.isStarred)}
        >
          <StarIcon />
        </button>
        <button className="pin-action" type="button" onClick={() => onEdit(pin)} aria-label="Edit pin">
          <EditIcon />
        </button>
        <button className="pin-action danger" type="button" onClick={() => onDelete(pin.id)} aria-label="Delete pin">
          <TrashIcon />
        </button>
      </div>

      {pin.isStarred ? (
        <span className="pin-star-badge">
          <StarIcon />
          Starred
        </span>
      ) : null}

      {pin.type === 'image-url' ? (
        <>
          <img className="pin-image" src={pin.imageUrl} alt={pin.alt || pin.caption || 'Pinned image'} loading="lazy" onLoad={handleMediaLoaded} onError={handleMediaLoaded} />
          <PinFooter pin={pin} />
        </>
      ) : null}

      {pin.type === 'upload' ? (
        <>
          <img className="pin-image" src={pin.imageData} alt={pin.alt || pin.caption || pin.fileName || 'Uploaded image'} loading="lazy" onLoad={handleMediaLoaded} onError={handleMediaLoaded} />
          <PinFooter pin={pin} />
        </>
      ) : null}

      {pin.type === 'quote' ? (
        <>
          <div className="quote-pin">
            <QuoteIcon />
            <blockquote>{pin.quote}</blockquote>
            {pin.author ? <cite>- {pin.author}</cite> : null}
          </div>
          <PinFooter pin={pin} />
        </>
      ) : null}

      {pin.type === 'link' ? (
        <>
          <a className="link-pin" href={pin.url} target="_blank" rel="noreferrer">
            {pin.previewImage ? (
              <img src={pin.previewImage} alt="" loading="lazy" onLoad={handleMediaLoaded} onError={handleMediaLoaded} />
            ) : (
              <span className="link-placeholder">
                <LinkIcon />
              </span>
            )}
            <span className="link-content">
              <span className="pin-type-label">Link</span>
              <strong>{pin.title}</strong>
              <span>{formatHostname(pin.url)}</span>
            </span>
          </a>
          <PinFooter pin={pin} />
        </>
      ) : null}
    </article>
  );
}

function PinFooter({ pin }: { pin: Pin }) {
  return (
    <footer className="pin-footer">
      <span>{pin.isStarred ? `Starred - ${pinTypeLabel(pin.type)}` : pinTypeLabel(pin.type)}</span>
      {pin.caption ? <p>{pin.caption}</p> : null}
    </footer>
  );
}

function EmptyBoard({ onAddPin }: { onAddPin: () => void }) {
  return (
    <section className="empty-state glass-panel">
      <div className="empty-icon">
        <ImageIcon />
      </div>
      <h2>This board is ready for your first pin.</h2>
      <p>Add an image URL, upload a photo, write a quote, or save a link with a preview.</p>
      <button className="primary-button" type="button" onClick={onAddPin}>
        <PlusIcon />
        Add pin
      </button>
    </section>
  );
}

interface ThemeSelectProps {
  id: string;
  label: string;
  value: ThemeId;
  onChange: (themeId: ThemeId) => void;
  helper?: string;
  compact?: boolean;
}

function ThemeSelect({ id, label, value, onChange, helper, compact = false }: ThemeSelectProps) {
  const selectedTheme = getTheme(value);

  return (
    <label className={`theme-select ${compact ? 'compact' : ''}`} style={boardStyle(value)} htmlFor={id}>
      <span className="theme-select-label">
        <PaletteIcon />
        {label}
      </span>
      <span className="theme-select-control">
        <span className="theme-select-swatch" aria-hidden="true" />
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(selectThemeId(event.target.value))}
          aria-label={label}
        >
          {THEMES.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </span>
      {helper ? <small>{helper}</small> : null}
      {compact ? <span className="sr-only">Current theme: {selectedTheme.name}</span> : null}
    </label>
  );
}

interface PinModalProps {
  activeThemeId: ThemeId;
  initialPin?: Pin;
  onSave: (draft: AddPinDraft) => void;
  onClose: () => void;
}

function PinModal({ activeThemeId, initialPin, onSave, onClose }: PinModalProps) {
  const isEditing = Boolean(initialPin);
  const [type, setType] = useState<PinType>(initialPin?.type ?? 'image-url');
  const [imageUrl, setImageUrl] = useState(initialPin?.type === 'image-url' ? initialPin.imageUrl : '');
  const [imageAlt, setImageAlt] = useState(initialPin?.type === 'image-url' ? initialPin.alt ?? '' : '');
  const [uploadData, setUploadData] = useState(initialPin?.type === 'upload' ? initialPin.imageData : '');
  const [uploadFileName, setUploadFileName] = useState(initialPin?.type === 'upload' ? initialPin.fileName ?? '' : '');
  const [uploadAlt, setUploadAlt] = useState(initialPin?.type === 'upload' ? initialPin.alt ?? '' : '');
  const [quote, setQuote] = useState(initialPin?.type === 'quote' ? initialPin.quote : '');
  const [quoteAuthor, setQuoteAuthor] = useState(initialPin?.type === 'quote' ? initialPin.author ?? '' : '');
  const [quoteThemeId, setQuoteThemeId] = useState<ThemeId>(initialPin?.type === 'quote' ? initialPin.themeId : activeThemeId);
  const [linkUrl, setLinkUrl] = useState(initialPin?.type === 'link' ? initialPin.url : '');
  const [linkTitle, setLinkTitle] = useState(initialPin?.type === 'link' ? initialPin.title : '');
  const [linkPreviewImage, setLinkPreviewImage] = useState(initialPin?.type === 'link' ? initialPin.previewImage ?? '' : '');
  const [caption, setCaption] = useState(initialPin?.caption ?? '');
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    setError('');
  }, [type]);

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      setUploadStatus('Optimizing image for local storage...');
      const dataUrl = await imageFileToOptimizedDataUrl(file);
      setUploadData(dataUrl);
      setUploadFileName(file.name);
      setUploadStatus('Image ready.');
    } catch (uploadError) {
      setUploadStatus('');
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload this image.');
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (type === 'image-url') {
        onSave({ type, imageUrl, caption, alt: imageAlt });
      } else if (type === 'upload') {
        onSave({ type, imageData: uploadData, fileName: uploadFileName, caption, alt: uploadAlt });
      } else if (type === 'quote') {
        onSave({ type, quote, author: quoteAuthor, caption, themeId: quoteThemeId });
      } else {
        onSave({ type, url: linkUrl, title: linkTitle, previewImage: linkPreviewImage, caption });
      }

      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Please check your pin details.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="pin-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{isEditing ? 'Edit pin' : 'Create pin'}</span>
            <h2 id="pin-modal-title">{isEditing ? 'Update this inspiration' : 'Add something inspiring'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close modal">
            <XIcon />
          </button>
        </div>

        <div className="pin-type-tabs" role="tablist" aria-label="Pin type">
          {pinOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              className={option.type === type ? 'active' : ''}
              onClick={() => setType(option.type)}
              aria-selected={option.type === type}
            >
              {pinIcon(option.type)}
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          ))}
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {type === 'image-url' ? (
            <>
              <label>
                Image URL
                <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/image.jpg" required />
              </label>
              <label>
                Alt text
                <input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the image" />
              </label>
            </>
          ) : null}

          {type === 'upload' ? (
            <>
              <label className="upload-zone">
                <UploadIcon />
                <span>{uploadFileName || 'Choose an image from your device'}</span>
                <small>{isEditing ? 'Choose a new file to replace the saved image.' : 'Large images are resized before saving locally.'}</small>
                <input type="file" accept="image/*" onChange={handleUploadChange} />
              </label>
              {uploadData ? <img className="upload-preview" src={uploadData} alt="Upload preview" /> : null}
              {uploadStatus ? <p className="form-note">{uploadStatus}</p> : null}
              <label>
                Alt text
                <input value={uploadAlt} onChange={(event) => setUploadAlt(event.target.value)} placeholder="Describe the uploaded image" />
              </label>
            </>
          ) : null}

          {type === 'quote' ? (
            <>
              <label>
                Quote or affirmation
                <textarea value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="I am becoming the version of me I once dreamed about." required />
              </label>
              <label>
                Author or label
                <input value={quoteAuthor} onChange={(event) => setQuoteAuthor(event.target.value)} placeholder="Morning affirmation" />
              </label>
              <ThemeSelect
                id="quote-theme"
                label="Quote color"
                value={quoteThemeId}
                onChange={setQuoteThemeId}
                helper="This controls the gradient used behind this quote pin."
              />
            </>
          ) : null}

          {type === 'link' ? (
            <>
              <label>
                Link URL
                <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" required />
              </label>
              <label>
                Title
                <input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Article, shop, playlist, resource..." />
              </label>
              <label>
                Optional preview image URL
                <input value={linkPreviewImage} onChange={(event) => setLinkPreviewImage(event.target.value)} placeholder="https://example.com/preview.jpg" />
              </label>
            </>
          ) : null}

          <label>
            Caption
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Why this belongs on your board..." />
          </label>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              {isEditing ? <EditIcon /> : <PlusIcon />}
              {isEditing ? 'Save changes' : 'Save pin'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

interface NewBoardModalProps {
  onCreate: (name: string, themeId: ThemeId) => void;
  onClose: () => void;
}

function NewBoardModal({ onCreate, onClose }: NewBoardModalProps) {
  const [name, setName] = useState('');
  const [themeId, setThemeId] = useState<ThemeId>('orchid');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate(name, themeId);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal compact glass-panel" role="dialog" aria-modal="true" aria-labelledby="new-board-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">New board</span>
            <h2 id="new-board-title">Name the next chapter</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close modal">
            <XIcon />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Board name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Home Sanctuary, Wellness, Style..." autoFocus required />
          </label>

          <ThemeSelect
            id="new-board-theme"
            label="Board color theme"
            value={themeId}
            onChange={setThemeId}
            helper="This theme will tint the board glow, buttons, and board card."
          />

          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              <PlusIcon />
              Create board
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default App;
