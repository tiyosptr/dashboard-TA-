# 🎨 Fullscreen Monitoring - Visual Guide

## 📸 Screenshot Examples

### **1. Machine Management Page dengan Tombol Fullscreen**
```
┌─────────────────────────────────────────────────────────────────┐
│                    MACHINE MANAGEMENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Machine Management                                     │    │
│  │  Real-time monitoring dan kontrol seluruh mesin produksi│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [Fullscreen Monitoring]  [Tambah Mesin]  [Refresh Data] │    │
│  │  ██████████████████████  ██████████████  ██████████████ │    │
│  │  Gradient Indigo-Purple   Solid Indigo    Light Indigo   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### **2. Fullscreen Monitoring Interface**
```
┌─────────────────────────────────────────────────────────────────┐
│                    FULLSCREEN MONITORING                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [←] [Line 1] [Line 2] [Line 3] [Unassigned] [→]       │    │
│  │  [Auto: ON (15s)]  [Fullscreen]  [⚙ Settings]          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  LINE 1 - 8 machines • Auto rotation: ON • 15s interval│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │ M1   │ │ M2   │ │ M3   │ │ M4   │                           │
│  │ ACTV │ │ MAINT│ │ DOWN │ │ ACTV │                           │
│  └──────┘ └──────┘ └──────┘ └──────┘                           │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │ M5   │ │ M6   │ │ M7   │ │ M8   │                           │
│  │ HOLD │ │ ACTV │ │ ACTV │ │ INACT│                           │
│  └──────┘ └──────┘ └──────┘ └──────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### **3. Machine Card Design**
```
┌─────────────────────────────────────────────────────────────────┐
│                    MACHINE CARD DETAIL                           │
├─────────────────────────────────────────────────────────────────┤
│  ████████████████████████████████████████████████████████████   │
│  │ Extruder #5                                 [ACTIVE]      │   │
│  │ Process: Extrusion • Last: 26 Apr • Next: 03 May         │   │
│  │                                                          │   │
│  │ OEE: ████████████████████████████████████████ 85%       │   │
│  │                                                          │   │
│  │ Output    Throughput   Cycle Time   Defect Rate         │   │
│  │ 1,234     45.6/min     12.3 sec     1.2%               │   │
│  │                                                          │   │
│  │ Running Hours: 245h 30m                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### **4. Status Color Coding**
```
┌─────────────────────────────────────────────────────────────────┐
│                    STATUS COLOR GUIDE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🟢 ACTIVE: Machine beroperasi normal                   │    │
│  │  Gradient: from-green-400 to-emerald-500                │    │
│  │  Text: text-green-600 • BG: bg-green-50                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🟡 MAINTENANCE: Sedang maintenance                     │    │
│  │  Gradient: from-yellow-400 to-amber-500                 │    │
│  │  Text: text-yellow-600 • BG: bg-yellow-50               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🟠 ON HOLD: Production paused                          │    │
│  │  Gradient: from-orange-400 to-red-500                   │    │
│  │  Text: text-orange-600 • BG: bg-orange-50               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🔴 DOWNTIME: Machine down/error                        │    │
│  │  Gradient: from-red-400 to-rose-500                      │    │
│  │  Text: text-red-600 • BG: bg-red-50                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ⚫ INACTIVE: Machine offline/stopped                    │    │
│  │  Gradient: from-gray-400 to-slate-500                    │    │
│  │  Text: text-gray-600 • BG: bg-gray-50                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### **5. Settings Panel**
```
┌─────────────────────────────────────────────────────────────────┐
│                    SETTINGS PANEL                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Rotation Interval (seconds)                           │    │
│  │  [ - ]   [ 15 ]   [ + ]                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Filter by Status                                       │    │
│  │  [▽ All Status ▽]                                      │    │
│  │  • All Status • Active • Maintenance                    │    │
│  │  • On Hold • Downtime • Inactive                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Search Machines                                        │    │
│  │  [🔍 Search machine name...]                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### **6. Keyboard Shortcuts Overlay**
```
┌─────────────────────────────────────────────────────────────────┐
│                    KEYBOARD SHORTCUTS                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Keyboard Shortcuts:                                   │    │
│  │  ← → Navigate • Space Pause/Play • F11 Fullscreen     │    │
│  │  Esc Exit • ↑ ↓ Scroll                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Palette

### **Primary Colors**
```css
/* Background */
bg-slate-950      /* Fullscreen background */
bg-slate-900      /* Card background */
bg-slate-800      /* Control panel */

/* Status Colors */
from-green-400 to-emerald-500    /* Active */
from-yellow-400 to-amber-500     /* Maintenance */
from-orange-400 to-red-500       /* On Hold */
from-red-400 to-rose-500         /* Downtime */
from-gray-400 to-slate-500       /* Inactive */

/* Text Colors */
text-white        /* Primary text */
text-slate-300    /* Secondary text */
text-slate-400    /* Tertiary text */
text-slate-500    /* Disabled text */
```

### **Gradient Combinations**
```css
/* Machine Card Top Bar */
bg-gradient-to-r from-{color}-400 to-{color}-500

/* OEE Progress Bar */
bg-gradient-to-r from-{color}-400 to-{color}-500

/* Button Hover Effects */
hover:from-{color}-600 hover:to-{color}-700
```

---

## 📐 Layout Grid System

### **Desktop (1920x1080+)**
```
4-column grid:
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Col1 │ │ Col2 │ │ Col3 │ │ Col4 │
└──────┘ └──────┘ └──────┘ └──────┘

Card Dimensions: 320px × 280px
Gap: 16px
Padding: 16px
```

### **Tablet (1024x768)**
```
3-column grid:
┌──────┐ ┌──────┐ ┌──────┐
│ Col1 │ │ Col2 │ │ Col3 │
└───��──┘ └──────┘ └──────┘

Card Dimensions: 280px × 240px
Gap: 12px
Padding: 12px
```

### **Mobile (768x)**
```
2-column grid:
┌──────┐ ┌──────┐
│ Col1 │ │ Col2 │
└──────┘ └──────┘

Card Dimensions: 240px × 200px
Gap: 8px
Padding: 8px
```

---

## 🔤 Typography Scale

### **Headings**
```css
h1: text-2xl font-bold      /* Page title */
h2: text-xl font-bold        /* Line header */
h3: text-lg font-bold        /* Machine name */
h4: text-base font-semibold  /* Metric label */
```

### **Body Text**
```css
p: text-sm                   /* Description */
span: text-xs               /* Status badge */
small: text-[10px]          /* Small labels */
```

### **Metrics Display**
```css
.metric-value: text-lg font-bold
.metric-unit: text-xs text-slate-500
.metric-label: text-[10px] font-semibold uppercase
```

---

## 🎯 Visual Hierarchy

### **Level 1: Critical Information**
- Machine status (color bar + badge)
- Machine name
- Current line

### **Level 2: Key Metrics**
- OEE percentage and bar
- Output count
- Throughput rate

### **Level 3: Secondary Metrics**
- Cycle time
- Defect rate
- Running hours

### **Level 4: Contextual Information**
- Process name
- Maintenance dates
- Line/process tags

---

## ✨ Visual Effects

### **Animations**
```css
/* Pulse animation for status dot */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Hover effects */
.group:hover .group-hover\:bg-{color}-200 {
  background-color: var(--color);
}

/* Transition effects */
.transition-all {
  transition: all 0.3s ease;
}

.duration-300 {
  transition-duration: 300ms;
}
```

### **Shadows & Depth**
```css
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

.shadow-indigo-600\/30 {
  box-shadow: 0 4px 6px -1px rgb(99 102 241 / 0.3);
}
```

---

## 📱 Responsive Behavior

### **Breakpoints**
```css
/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) { ... }

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) { ... }

/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) { ... }

/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) { ... }
```

### **Adaptive Layouts**
1. **< 768px**: 2 columns, condensed info
2. **768px - 1200px**: 3 columns, standard info
3. **> 1200px**: 4 columns, full details

### **Touch Targets**
```css
/* Minimum touch target size */
.min-touch-target {
  min-width: 44px;
  min-height: 44px;
}

/* Spacing for touch devices */
.touch-gap {
  gap: 12px;
}
```

---

## 🎨 Accessibility Features

### **Color Contrast**
```
Text/Background: Minimum 4.5:1 ratio
Large Text: Minimum 3:1 ratio
UI Components: Minimum 3:1 ratio
```

### **Focus Indicators**
```css
.focus\:ring-2:focus {
  ring-width: 2px;
}

.focus\:ring-indigo-500:focus {
  ring-color: #6366f1;
}

.focus\:outline-none:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}
```

### **Screen Reader Support**
```html
<!-- ARIA labels -->
<button aria-label="Toggle fullscreen mode">
  <Maximize2 />
</button>

<!-- Live regions for updates -->
<div aria-live="polite" aria-atomic="true">
  Line changed to: {currentLineName}
</div>

<!-- Status announcements -->
<div role="status" aria-live="assertive">
  Critical alert: Machine {machineName} is down
</div>
```

---

## 🖼️ Mockup Examples

### **Control Room Display**
```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTROL ROOM DISPLAY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  PT Volex Indonesia - Production Monitoring            │    │
│  │  Date: 2026-04-30 | Time: 14:30:25                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  LINE 3 - Assembly Line (8/10 machines active)         │    │
│  │  OEE: 87% | Output: 12,345 | Defect Rate: 1.2%         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ ASM1 │ │ ASM2 │ │ ASM3 │ │ ASM4 │ │ ASM5 │ │ ASM6 │         │
│  │ 92%  │ │ 88%  │ │ 85%  │ │ 91%  │ │ 78%  │ │ 94%  │         │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Next: LINE 4 in 12 seconds...                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### **Production Meeting Display**
```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION MEETING                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Daily Production Review - April 30, 2026               │    │
│  │  Supervisor: John Doe | Shift: Morning                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  KEY PERFORMANCE INDICATORS                              │    │
│  │  Overall OEE: 84% | Total Output: 45,678                │    │
│  │  Defect Rate: 2.1% | Downtime: 3.2%                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  LINE PERFORMANCE RANKING                               │    │
│  │  1. Line 3: 87% OEE                                    │    │
│  │  2. Line 1: 85% OEE                                    │    │
│  │  3. Line 2: 82% OEE                                    │    │
│  │  4. Line 4: 79% OEE (Needs Attention)                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎬 Animation Sequences

### **Line Transition Animation**
```
Sequence: Line 1 → Line 2
1. Current line fades out (300ms)
2. New line title slides in (200ms)
3. Machine cards stagger in (100ms each)
4. Metrics animate to new values (500ms)
```

### **Status Change Animation**
```
Sequence: Active → Downtime
1. Status bar color transitions (400ms)
2. Status badge updates with flip (300ms)
3. Alert pulse animation starts (2s cycle)
4. Metrics update with count animation
```

### **Fullscreen Transition**
```
Sequence: Normal → Fullscreen
1. Screen dims to black (200ms)
2. Content scales up (300ms)
3. Controls fade in (200ms)
4. Auto rotation starts (500ms delay)
```

---

**Design System Version:** 1.0.0  
**Last Updated:** 2026-04-30  
**Designer:** AI Assistant  
**Status:** ✅ Production Ready