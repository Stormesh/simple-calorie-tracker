<script setup lang="ts">
import { isNativeShell, openExternal } from "~/utils/native";

const FATSECRET_URL = "https://www.fatsecret.com";

/**
 * In the APK a plain link would navigate the WebView to fatsecret.com, leaving
 * the app with no address bar and no way back — so native hands the URL to the
 * system browser instead. On the web the link behaves as it always has
 * (new tab), which also keeps middle-click and "copy link" working there.
 */
const onClick = (event: MouseEvent) => {
  if (!isNativeShell()) return;
  // Let modified clicks (open in new tab, etc.) do their own thing.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

  event.preventDefault();
  void openExternal(FATSECRET_URL);
};
</script>

<template>
  <a
    :href="FATSECRET_URL"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="FatSecret"
    @click="onClick"
  >
    <img
      src="https://platform.fatsecret.com/api/static/images/powered_by_fatsecret.svg"
      border="0"
      alt="FatSecret"
    />
  </a>
</template>
