<script setup lang="ts">
interface FoodProps {
  title: string;
  foods?: string[];
}

const { title, foods = Array(6).fill("") } = defineProps<FoodProps>();

const foodsRef = ref([...foods]);

const deleteItem = (index: number) => {
  // Allow deletion but ensure there's always at least one item
  if (foodsRef.value.length <= 1) {
    // If trying to delete the last item, just clear it instead
    foodsRef.value[0] = "";
    return;
  }

  foodsRef.value.splice(index, 1);
};

const addItem = () => {
  foodsRef.value.push("");
};

const changeFoodDetails = async (index: number) => {
  const food = foodsRef.value[index];
  const details = await searchFood(food);
  if (details) {
    foodDetails.value = details;
  }
};
</script>

<template>
  <div class="m-4">
    <h1
      class="text-2xl bg-slate-500 rounded-t-xl text-white text-center font-black"
    >
      {{ title }}
    </h1>
    <ul class="bg-slate-300 rounded-b-xl">
      <li v-for="(_, index) in foodsRef" :key="index">
        <div class="py-1.5 mx-2">
          <div
            class="w-64 h-10 flex relative rounded-lg overflow-hidden shadow"
          >
            <div class="container inline-block bg-stone-50 p-2">
              <input
                v-model="foodsRef[index]"
                class="focus:outline-none focus:placeholder-shown:scale-110 focus:placeholder-shown:translate-x-3 transition-transform container"
                type="text"
                placeholder="Enter food"
              >
            </div>
            <button
              class="min-h-fit inline-block bg-slate-600 hover:bg-slate-500 group cursor-pointer"
              @click="changeFoodDetails(index)"
            >
              <Icon
                name="ic:outline-keyboard-double-arrow-down"
                size="2.5rem"
                class="text-white group-hover:translate-y-1 transition-transform duration-150"
              />
            </button>
            <button
              class="min-h-fit inline-block bg-slate-600 hover:bg-slate-500 group cursor-pointer"
              @click="deleteItem(index)"
            >
              <Icon
                name="ic:outline-delete"
                size="2.5rem"
                class="text-white group-hover:scale-110 group-hover:text-red-600 transition-all duration-150"
              />
            </button>
          </div>
        </div>
      </li>
      <div class="flex justify-center overflow-hidden">
        <button
          class="px-4 py-1 bg-slate-600 hover:bg-slate-500 font-bold translate-y-2 hover:translate-y-0 transition-transform text-white rounded-t-xl cursor-pointer"
          @click="addItem"
        >
          Add food
          <Icon
            name="ic:outline-add"
            size="2rem"
            class="inline-block align-middle"
          />
        </button>
      </div>
    </ul>
  </div>
</template>
