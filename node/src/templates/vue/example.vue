<script setup>
const data = templateData;
</script>

<template>
<div class="my-component">Hello md2x! This is vue template</div>
<div v-for="(item, index) in data" :key="index">
  <h2>{{ item.title }}</h2>
  <p>{{ item.message }}</p>
</div>
</template>

<style scoped>
.my-component {
  color: red;
}
</style>
