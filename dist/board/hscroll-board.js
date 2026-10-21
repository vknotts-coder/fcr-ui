"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useCallback } from "react";
// Shared horizontal-scroll container for the fleet's drag tile boards (fcr-estimating #18, fcr-trailers #58).
// Above the lanes/columns: a one-column ‹ › arrow pair (tap = one column, press-and-hold = glide) and a slim
// top scrollbar kept in lockstep with the board, so left/right is reachable without scrolling to the bottom of
// a tall board. It also AUTO-SCROLLS while a card is dragged near either edge (native HTML5 drag never scrolls
// the container on its own). The lanes/columns are the children; each board keeps its own drop handlers.
// `verticalScroll` makes the board a bounded-height vertical scrollport so `sticky top-0` headers stick.
// ⚠ The flex row is `items-start`, NOT the default `stretch`: under stretch with a bounded height a sticky
// header unpins after one screenful; items-start lets each column size to its own content.
//
// Consumer requirements (peer styling, same injection model as the rest of @fcr/ui): the `fcr-*` Tailwind
// tokens and a `.board-hscroll` scrollbar rule must exist in the consumer's globals.css (add the package dist
// to its `@source`). No app/data deps — this is pure presentation + interaction.
export function HScrollBoard({ children, contentKey, verticalScroll = false }) {
    const boardRef = useRef(null);
    const barRef = useRef(null);
    const [metrics, setMetrics] = useState({ scrollW: 0, clientW: 0 });
    const scrollable = metrics.scrollW - metrics.clientW > 1;
    const [maxH, setMaxH] = useState(undefined);
    useEffect(() => {
        if (!verticalScroll || typeof window === "undefined")
            return;
        const measureH = () => {
            const el = boardRef.current;
            if (!el)
                return;
            const top = el.getBoundingClientRect().top;
            const h = Math.max(240, Math.round(window.innerHeight - top - 16));
            setMaxH((prev) => (prev === h ? prev : h));
        };
        measureH();
        window.addEventListener("resize", measureH);
        let ro;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(measureH);
            ro.observe(document.body);
        }
        return () => { window.removeEventListener("resize", measureH); ro?.disconnect(); };
    }, [verticalScroll, contentKey]);
    const measure = useCallback(() => {
        const el = boardRef.current;
        if (!el)
            return;
        setMetrics((prev) => prev.scrollW === el.scrollWidth && prev.clientW === el.clientWidth
            ? prev
            : { scrollW: el.scrollWidth, clientW: el.clientWidth });
    }, []);
    useEffect(() => {
        const el = boardRef.current;
        if (!el || typeof ResizeObserver === "undefined")
            return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [measure]);
    useEffect(() => { measure(); }, [measure, contentKey]);
    const syncScroll = (src) => {
        const board = boardRef.current, bar = barRef.current;
        if (!board || !bar)
            return;
        const [from, to] = src === "board" ? [board, bar] : [bar, board];
        const fromMax = from.scrollWidth - from.clientWidth;
        const toMax = to.scrollWidth - to.clientWidth;
        const target = fromMax > 0 ? (from.scrollLeft / fromMax) * toMax : 0;
        if (Math.abs(to.scrollLeft - target) > 1)
            to.scrollLeft = target;
    };
    const colStep = () => {
        const board = boardRef.current;
        if (!board)
            return 268;
        const lane = board.firstElementChild;
        const gap = parseFloat(getComputedStyle(board).columnGap || "0") || 0;
        return lane ? lane.offsetWidth + gap : 268;
    };
    const nudge = (dir) => boardRef.current?.scrollBy({ left: dir * colStep(), behavior: "smooth" });
    const holdRaf = useRef(null);
    const holdTimer = useRef(null);
    const stopGlide = () => {
        if (holdRaf.current != null) {
            cancelAnimationFrame(holdRaf.current);
            holdRaf.current = null;
        }
    };
    const startGlide = (dir) => {
        stopGlide();
        const tick = () => { boardRef.current?.scrollBy({ left: dir * 14 }); holdRaf.current = requestAnimationFrame(tick); };
        holdRaf.current = requestAnimationFrame(tick);
    };
    const onHoldStart = (dir) => {
        nudge(dir);
        holdTimer.current = setTimeout(() => startGlide(dir), 300);
    };
    const onHoldEnd = () => {
        if (holdTimer.current != null) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
        stopGlide();
    };
    const dragRaf = useRef(null);
    const dragDir = useRef(0);
    const stopDragScroll = () => {
        dragDir.current = 0;
        if (dragRaf.current != null) {
            cancelAnimationFrame(dragRaf.current);
            dragRaf.current = null;
        }
    };
    const runDragScroll = () => {
        if (dragDir.current === 0) {
            dragRaf.current = null;
            return;
        }
        boardRef.current?.scrollBy({ left: dragDir.current * 16 });
        dragRaf.current = requestAnimationFrame(runDragScroll);
    };
    const onDragOver = (e) => {
        const board = boardRef.current;
        if (!board)
            return;
        const rect = board.getBoundingClientRect();
        const EDGE = 72;
        const dir = e.clientX > rect.right - EDGE ? 1 : e.clientX < rect.left + EDGE ? -1 : 0;
        dragDir.current = dir;
        if (dir !== 0) {
            if (dragRaf.current == null)
                dragRaf.current = requestAnimationFrame(runDragScroll);
        }
        else
            stopDragScroll();
    };
    const onContainerDragLeave = (e) => {
        if (!boardRef.current?.contains(e.relatedTarget))
            stopDragScroll();
    };
    useEffect(() => () => { onHoldEnd(); stopDragScroll(); }, []);
    return (_jsxs(_Fragment, { children: [scrollable && (_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [_jsx(ArrowButton, { glyph: "\u2039", label: "Scroll one column left", onNudge: () => nudge(-1), onHoldStart: () => onHoldStart(-1), onHoldEnd: onHoldEnd }), _jsx("div", { ref: barRef, onScroll: () => syncScroll("bar"), className: "board-hscroll h-3 flex-1 overflow-x-auto rounded", children: _jsx("div", { style: { width: metrics.scrollW }, className: "h-px" }) }), _jsx(ArrowButton, { glyph: "\u203A", label: "Scroll one column right", onNudge: () => nudge(1), onHoldStart: () => onHoldStart(1), onHoldEnd: onHoldEnd })] })), _jsx("div", { ref: boardRef, onScroll: () => syncScroll("board"), onDragOver: onDragOver, onDragLeave: onContainerDragLeave, onDrop: stopDragScroll, onDragEnd: stopDragScroll, className: `flex items-start gap-3 overflow-x-auto pb-4 ${verticalScroll ? "overflow-y-auto" : ""}`, style: verticalScroll && maxH ? { maxHeight: maxH } : undefined, children: children })] }));
}
function ArrowButton({ glyph, label, onNudge, onHoldStart, onHoldEnd }) {
    return (_jsx("button", { type: "button", "aria-label": label, onPointerDown: onHoldStart, onPointerUp: onHoldEnd, onPointerLeave: onHoldEnd, onPointerCancel: onHoldEnd, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNudge();
        } }, className: "flex h-7 w-7 shrink-0 select-none items-center justify-center rounded border border-fcr-line bg-white text-fcr-ink/70 hover:bg-fcr-ink/5", children: glyph }));
}
