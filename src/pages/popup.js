import { apiNs } from "../utils/compat";

import { render } from "preact";
import { useEffect, useState, useRef, useCallback } from "react";

import { T, TT } from "../utils/i18n";
import Generator from "./components/Generator";
import Scanner from "./components/Scanner";
import Historian from "./components/Historian";
import { SettingsContextProvider } from "../utils/hooks";

function Popup() {
  const [options, setOptions] = useState(null);
  const [component, setComponent] = useState(null);
  const generatorRef = useRef(null);
  const pastedImageUrl = useRef(null);
  const [inputError, setInputError] = useState("");
  const [capturing, setCapturing] = useState(false);

  const openImage = useCallback((file) => {
    if (!file?.type?.startsWith("image/")) {
      setInputError(T("local_image_invalid"));
      return;
    }
    if (pastedImageUrl.current) URL.revokeObjectURL(pastedImageUrl.current);
    pastedImageUrl.current = URL.createObjectURL(file);
    setInputError("");
    setOptions({ action: "POPUP_DECODE", url: pastedImageUrl.current });
  }, []);

  const capturePage = async () => {
    setCapturing(true);
    setInputError("");
    try {
      const url = await apiNs.tabs.captureVisibleTab({ format: "png" });
      setOptions({ action: "POPUP_DECODE", url });
    } catch (e) {
      setInputError(T("capture_failed") + ": " + e.message);
    } finally {
      setCapturing(false);
    }
  };

  const handlePaste = useCallback((e) => {
    if (e.clipboardData?.files?.length > 0) {
      const file = e.clipboardData.files[0];

      if (file?.type?.startsWith("image/")) {
        e.preventDefault();
        openImage(file);
        return false;
      }
    }

    const text = e.clipboardData?.getData("text/plain");

    if (text) {
      generatorRef.current?.setContentAndTitle(text);
      setOptions({ action: "POPUP_ENCODE", text });
      return false;
    }

    return true;
  }, [openImage]);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);

      // Keep the URL alive while the result preview still uses it.
      if (pastedImageUrl.current) {
        URL.revokeObjectURL(pastedImageUrl.current);
        pastedImageUrl.current = null;
      }
    };
  }, [handlePaste]);

  useEffect(() => {
    apiNs.runtime
      .sendMessage({
        action: "POPUP_GET_OPTIONS",
      })
      .then((r) => {
        if (r) {
          return r;
        }
        return { action: "POPUP_DECODE" };
      })
      .then((r) => {
        setOptions((current) => current || r || { action: "POPUP_DECODE" });
      });
  }, []);

  useEffect(() => {
    if (options) {
      switch (options.action) {
        case "POPUP_DECODE":
          setComponent(
            <Scanner
              url={options?.url}
              tabId={options?.tabId}
              frameId={options?.frameId}
              targetElementId={options?.targetElementId}
            />
          );
          break;
        case "POPUP_DECODE_CAMERA":
          setComponent(<Scanner mode={"camera"} />);
          break;
        case "POPUP_HISTORY":
          setComponent(
            <Historian
              onClickItem={(item) => {
                generatorRef.current?.setContentAndTitle(item.text);
                setOptions({ action: "POPUP_ENCODE" });
              }}
            ></Historian>
          );
          break;
        case "POPUP_ENCODE":
          if (generatorRef.current) {
            if (options.text !== undefined) {
              generatorRef.current.setContentAndTitle(
                options.text,
                options.title || ""
              );
            }
          }
        // fallthrough
        default:
          setComponent(null);
          break;
      }
    }
  }, [options]);

  return (
    <div class="container"
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        openImage(e.dataTransfer?.files?.[0]);
      }}
    >
      <div class="tabs-container">
        <div
          class={
            "tabs-item " + (options?.action === "POPUP_ENCODE" ? "active" : "")
          }
          id="tab-generate"
          title={T("tab_generate_title")}
          onClick={() => setOptions({ action: "POPUP_ENCODE" })}
        >
          <div class="tabs-item-label">
            <img class="icon icon-invert" src="../icons/generate.svg" />
            <span class="tabs-item-text">{TT("tab_generate_title")}</span>
          </div>
        </div>
        <div
          class={
            "tabs-item " + (options?.action === "POPUP_DECODE" ? "active" : "")
          }
          id="tab-scan"
          title={T("tab_scan_title")}
          onClick={() => setOptions({ action: "POPUP_DECODE" })}
        >
          <div class="tabs-item-label">
            <img class="icon icon-invert" src="../icons/scan.svg" />
            <span class="tabs-item-text">{TT("tab_scan_title")}</span>
          </div>
        </div>
        <div
          class={
            "tabs-item " + (options?.action === "POPUP_HISTORY" ? "active" : "")
          }
          id="tab-history"
          title={T("tab_history_title")}
          onClick={() => setOptions({ action: "POPUP_HISTORY" })}
        >
          <div class="tabs-item-label">
            <img class="icon icon-invert" src="../icons/history.svg" />
            <span class="tabs-item-text">{TT("tab_history_title")}</span>
          </div>
        </div>
        <div
          class="tabs-item"
          id="tab-settings"
          title={T("tab_settings_title")}
          onClick={() => {
            apiNs.runtime.openOptionsPage();
            window.close();
          }}
        >
          <div class="tabs-item-label">
            <img class="icon icon-invert" src="../icons/gear.svg" />
          </div>
        </div>
      </div>
      {options?.action === "POPUP_DECODE" && <div class="scan-tools">
        <label class="clickable">{TT("choose_local_image")}
          <input type="file" accept="image/*" onChange={(e) => {
            if (e.target.files[0]) openImage(e.target.files[0]);
            e.target.value = "";
          }} />
        </label>
        <button disabled={capturing} onClick={capturePage}>{TT("capture_page")}</button>
        <span>{TT("local_image_hint")}</span>
      </div>}
      {inputError && <p role="alert">{inputError}</p>}
      <div class="content-container" data-role="content">
        {/* keep generator mounted so that it doesn't lose its state */}
        <Generator
          ref={generatorRef}
          hidden={!!component}
          content={
            options?.action === "POPUP_ENCODE" ? options?.text || "" : ""
          }
          title={options?.action === "POPUP_ENCODE" ? options?.title || "" : ""}
        />
        {component}
      </div>
    </div>
  );
}

if (QRLITE_BROWSER === "chrome") {
  // this, in combination with hard-coded body width and height (in popup.css)
  // prevents the UI being zoomed in chrome if the browser's default zoom level is >100%
  // this has to be done as fast as possible or it will cause visible flicker
  if (window.innerHeight < document.documentElement.scrollHeight) {
    document.documentElement.style.zoom =
      window.innerHeight / document.documentElement.scrollHeight;
  }
}

render(
  <SettingsContextProvider>
    <Popup />
  </SettingsContextProvider>,
  document.body
);
