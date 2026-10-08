(() => {
  const root = document.querySelector("[data-globe]");
  if (!root) return;

  const canvas = root.querySelector("[data-globe-canvas]");
  const status = root.querySelector("[data-globe-status]");
  const pauseButton = root.querySelector("[data-globe-pause]");
  const resetButton = root.querySelector("[data-globe-reset]");
  const leftButton = root.querySelector("[data-globe-left]");
  const rightButton = root.querySelector("[data-globe-right]");
  const retryButton = root.querySelector("[data-globe-retry]");
  if (!canvas || !status || !pauseButton || !resetButton || !leftButton || !rightButton || !retryButton) {
    return;
  }

  const defaultRotation = [-20, -14, 0];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scriptSources = [
    "/site-assets/vendor/d3-array.min.js",
    "/site-assets/vendor/d3-geo.min.js",
    "/site-assets/vendor/topojson-client.min.js"
  ];
  let cleanup = () => {};
  let cancelInitialFetch = () => {};
  let starting = false;

  function setStatus(message) {
    status.textContent = message;
  }

  function loadScript(source) {
    const existing = document.querySelector(`script[src="${source}"]`);
    if (existing?.dataset.loaded === "true") {
      return Promise.resolve();
    }
    if (existing?.dataset.failed === "true") {
      existing.remove();
    }
    const pending = document.querySelector(`script[src="${source}"]`);
    if (pending) {
      return new Promise((resolve, reject) => {
        pending.addEventListener("load", resolve, { once: true });
        pending.addEventListener("error", reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      script.defer = true;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true }
      );
      script.addEventListener(
        "error",
        () => {
          script.dataset.failed = "true";
          reject(new Error(`无法加载 ${source}`));
        },
        { once: true }
      );
      document.head.append(script);
    });
  }

  function updatePauseButton(isManuallyPaused) {
    pauseButton.setAttribute("aria-pressed", String(isManuallyPaused));
    pauseButton.setAttribute("aria-label", isManuallyPaused ? "恢复旋转" : "暂停旋转");
    pauseButton.setAttribute("title", isManuallyPaused ? "恢复旋转" : "暂停旋转");
    pauseButton.textContent = isManuallyPaused ? "▶" : "Ⅱ";
  }

  async function initialize() {
    if (starting) return;
    starting = true;
    retryButton.hidden = true;
    setStatus("地球即将进入可视区域后加载地图数据。");

    try {
      for (const source of scriptSources) {
        await loadScript(source);
      }
      const fetchController = new AbortController();
      cancelInitialFetch = () => fetchController.abort();
      const response = await fetch("/site-assets/world-110m.json", {
        credentials: "same-origin",
        signal: fetchController.signal
      });
      if (!response.ok) {
        throw new Error(`地图数据请求失败（${response.status}）`);
      }
      const world = await response.json();
      cancelInitialFetch = () => {};
      if (!window.d3?.geoOrthographic || !window.topojson?.feature || !world.objects?.land) {
        throw new Error("地图绘制依赖不完整");
      }

      cleanup();
      const controller = new AbortController();
      const signal = controller.signal;
      const projection = window.d3
        .geoOrthographic()
        .translate([240, 240])
        .scale(203)
        .clipAngle(90)
        .precision(0.35)
        .rotate(defaultRotation);
      const path = window.d3.geoPath(projection);
      const land = window.topojson.feature(world, world.objects.land);
      const graticule = window.d3.geoGraticule10();
      const namespace = "http://www.w3.org/2000/svg";
      const makePath = (className) => {
        const element = document.createElementNS(namespace, "path");
        element.setAttribute("class", className);
        canvas.append(element);
        return element;
      };

      canvas.replaceChildren();
      const sphere = makePath("globe-sphere");
      const grid = makePath("globe-grid");
      const landPath = makePath("globe-land");
      const outline = makePath("globe-outline");

      let longitude = defaultRotation[0];
      let latitude = defaultRotation[1];
      let manualPause = false;
      let hovering = false;
      let dragging = false;
      let pointerId = null;
      let pointerStartX = 0;
      let pointerStartY = 0;
      let pointerStartLongitude = longitude;
      let didDrag = false;
      let lastInteractionAt = 0;
      let inView = false;
      let animationFrame = 0;
      let lastFrameAt = 0;
      let stopped = false;

      const render = () => {
        projection.rotate([longitude, latitude, 0]);
        sphere.setAttribute("d", path({ type: "Sphere" }) ?? "");
        grid.setAttribute("d", path(graticule) ?? "");
        landPath.setAttribute("d", path(land) ?? "");
        outline.setAttribute("d", path({ type: "Sphere" }) ?? "");
      };

      const canRotate = () =>
        !stopped &&
        inView &&
        document.visibilityState === "visible" &&
        !manualPause &&
        !hovering &&
        !dragging &&
        !reducedMotion.matches &&
        performance.now() - lastInteractionAt > 850;

      const stopLoop = () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
        lastFrameAt = 0;
      };

      const tick = (now) => {
        if (!canRotate()) {
          stopLoop();
          return;
        }
        if (lastFrameAt) {
          const elapsed = Math.min((now - lastFrameAt) / 1_000, 0.12);
          longitude = (longitude + elapsed * 3) % 360;
          render();
        }
        lastFrameAt = now;
        animationFrame = requestAnimationFrame(tick);
      };

      const syncLoop = () => {
        if (canRotate() && !animationFrame) {
          animationFrame = requestAnimationFrame(tick);
        } else if (!canRotate()) {
          stopLoop();
        }
      };

      const rotateBy = (degrees) => {
        longitude = (longitude + degrees) % 360;
        lastInteractionAt = performance.now();
        render();
        syncLoop();
        window.setTimeout(syncLoop, 900);
      };

      const releasePointer = () => {
        if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) {
          canvas.releasePointerCapture(pointerId);
        }
        dragging = false;
        pointerId = null;
        if (didDrag) {
          lastInteractionAt = performance.now();
          window.setTimeout(syncLoop, 900);
        }
        didDrag = false;
        syncLoop();
      };

      const observer = new IntersectionObserver(
        (entries) => {
          inView = entries.some((entry) => entry.isIntersecting);
          syncLoop();
        },
        { rootMargin: "180px 0px" }
      );
      observer.observe(root);

      canvas.addEventListener(
        "pointerdown",
        (event) => {
          if (event.button !== 0 && event.pointerType === "mouse") return;
          pointerId = event.pointerId;
          pointerStartX = event.clientX;
          pointerStartY = event.clientY;
          pointerStartLongitude = longitude;
          dragging = true;
          didDrag = false;
          syncLoop();
        },
        { signal }
      );
      canvas.addEventListener(
        "pointermove",
        (event) => {
          if (event.pointerId !== pointerId) return;
          const horizontalDistance = event.clientX - pointerStartX;
          if (!didDrag && Math.abs(horizontalDistance) < 7) return;
          if (!didDrag && Math.abs(horizontalDistance) < Math.abs(event.clientY - pointerStartY)) return;
          didDrag = true;
          if (canvas.setPointerCapture && !canvas.hasPointerCapture?.(event.pointerId)) {
            canvas.setPointerCapture(event.pointerId);
          }
          longitude = pointerStartLongitude + horizontalDistance * 0.42;
          render();
        },
        { signal }
      );
      canvas.addEventListener("pointerup", releasePointer, { signal });
      canvas.addEventListener("pointercancel", releasePointer, { signal });
      canvas.addEventListener("lostpointercapture", releasePointer, { signal });
      canvas.addEventListener(
        "pointerenter",
        (event) => {
          if (event.pointerType === "mouse") {
            hovering = true;
            setStatus("已暂停自动旋转，可左右拖动地球。");
            syncLoop();
          }
        },
        { signal }
      );
      canvas.addEventListener(
        "pointerleave",
        (event) => {
          if (event.pointerType === "mouse") {
            hovering = false;
            setStatus(manualPause ? "旋转已手动暂停。" : "地球会在短暂停留后继续旋转。");
            syncLoop();
          }
        },
        { signal }
      );

      pauseButton.addEventListener(
        "click",
        () => {
          manualPause = !manualPause;
          updatePauseButton(manualPause);
          setStatus(manualPause ? "旋转已手动暂停。" : "旋转已恢复。" );
          syncLoop();
        },
        { signal }
      );
      resetButton.addEventListener(
        "click",
        () => {
          longitude = defaultRotation[0];
          latitude = defaultRotation[1];
          render();
          setStatus("地球已回到默认方向。" );
          syncLoop();
        },
        { signal }
      );
      leftButton.addEventListener("click", () => rotateBy(-18), { signal });
      rightButton.addEventListener("click", () => rotateBy(18), { signal });
      document.addEventListener("visibilitychange", syncLoop, { signal });
      const onMotionChange = () => {
        setStatus(reducedMotion.matches ? "系统已开启减少动态效果，地球保持静态。" : "地球可按当前状态旋转。" );
        syncLoop();
      };
      reducedMotion.addEventListener?.("change", onMotionChange, { signal });
      reducedMotion.addListener?.(onMotionChange);

      updatePauseButton(manualPause);
      render();
      setStatus(
        reducedMotion.matches
          ? "系统已开启减少动态效果，地球保持静态。"
          : "地球已就绪，可拖动、暂停或用方向按钮操作。"
      );
      syncLoop();

      cleanup = () => {
        stopped = true;
        stopLoop();
        observer.disconnect();
        controller.abort();
        reducedMotion.removeListener?.(onMotionChange);
      };
    } catch (error) {
      setStatus("地图数据暂时不可用，已保留静态地球轮廓。可以重试。" );
      retryButton.hidden = false;
      console.error("Globe initialization failed", error);
    } finally {
      cancelInitialFetch = () => {};
      starting = false;
    }
  }

  retryButton.addEventListener("click", initialize);
  const onPageHide = (event) => {
    if (event.persisted) return;
    cancelInitialFetch();
    cleanup();
    window.removeEventListener("pagehide", onPageHide);
  };
  window.addEventListener("pagehide", onPageHide);

  if ("IntersectionObserver" in window) {
    const bootstrapObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          bootstrapObserver.disconnect();
          initialize();
        }
      },
      { rootMargin: "220px 0px" }
    );
    bootstrapObserver.observe(root);
  } else {
    initialize();
  }
})();
