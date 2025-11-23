# Piano Roll Flex Layout Update

## Overview

Updated the piano roll modal layout so the piano roll editor flexes to fill the available space on the left, while the chatbot remains fixed at 384px on the far right.

## Changes Made

### 1. Container Layout

- **Piano Roll Content**: Parent container uses `flex` layout
- **Piano Roll Editor**: Uses `flex-1` to fill available space on the left
- **Chatbot Panel**: Fixed width (384px/`w-96`) on the right

### 2. Responsive Grid System

Changed from fixed pixel widths to flexible/percentage-based sizing:

#### Grid Container

**Before:**

```typescript
width: '600px',
minWidth: '600px'
```

**After:**

```typescript
width: '100%',
minWidth: '100%'
```

#### Time Ruler

**Before:**

```typescript
minWidth: '600px';
minWidth: `${600 / (clipData.bars * 4)}px`;
flex: `0 0 ${600 / (clipData.bars * 4)}px`;
```

**After:**

```typescript
width: '100%'
minWidth: '40px' (per beat)
flex: `1 0 ${100 / (clipData.bars * 4)}%`
```

#### Note Positioning

**Before:**

```typescript
const x = (note.start / clipData.bars) * 600;
const width = (note.duration / clipData.bars) * 600;
left: `${x}px`,
width: `${width}px`,
```

**After:**

```typescript
const x = (note.start / clipData.bars) * 100;
const width = (note.duration / clipData.bars) * 100;
left: `${x}%`,
width: `${width}%`,
```

### 3. Removed Constraints

- Removed `maxWidth: '700px'` from scrollable content area
- Piano roll now expands to fill all available horizontal space

## Layout Structure

```
┌────────────────────────────────────────────────────────┐
│                      Header (Fixed)                     │
├────────────────────────────────────────┬───────────────┤
│  Piano Roll Editor (flex-1)            │  Chatbot      │
│                                        │  (384px)      │
│  ┌─────┬──────────────────────────┐   │               │
│  │NOTE │ Time Ruler (100%)        │   │  ┌─────────┐  │
│  ├─────┼──────────────────────────┤   │  │ Header  │  │
│  │Keys │ Grid (100%)              │   │  ├─────────┤  │
│  │(80) │   • Flexible width       │   │  │Messages │  │
│  │     │   • Notes scale with %   │   │  │         │  │
│  └─────┴──────────────────────────┘   │  ├─────────┤  │
│                                        │  │ Input   │  │
└────────────────────────────────────────┴──┴─────────┘──┘
│                    Footer (Fixed)                       │
└────────────────────────────────────────────────────────┘
```

## Benefits

1. **Responsive**: Piano roll adapts to available screen space
2. **Consistent Chatbot**: AI assistant always visible at 384px
3. **No Gaps**: Layout fills the entire container width
4. **Proper Alignment**: Time ruler and grid stay synchronized via percentages
5. **Scalable**: Works with different screen sizes and window dimensions

## Technical Details

### Flex Hierarchy

```
flex-1 flex                           (Main content container)
├── flex-1 flex flex-col              (Piano roll - expands)
│   ├── flex                          (Header row)
│   │   ├── w-20                      (NOTE label)
│   │   └── flex-1                    (Time ruler container)
│   └── flex-1 flex                   (Scrollable area)
│       ├── w-20                      (Piano keys)
│       └── flex-1                    (Grid scroll container)
│           └── width: 100%           (Grid)
└── w-96                              (Chatbot - fixed 384px)
```

### Scroll Synchronization

Still maintained via refs:

- `timeRulerScrollRef.scrollLeft` syncs with grid horizontal scroll
- `pianoKeysRef.scrollTop` syncs with grid vertical scroll

### Grid Calculations

- Grid uses CSS Grid with `1fr` for columns (percentage-based)
- Notes use percentage positioning relative to clip bars
- Vertical positioning remains pixel-based (24px per key)

## Fixed Linter Issues

- Escaped quotes in example text: `"Create a C major scale"` → `&quot;Create a C major scale&quot;`
