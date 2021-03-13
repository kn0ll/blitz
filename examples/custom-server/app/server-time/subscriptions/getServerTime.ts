export default async function* getServerTime() {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    yield new Date()
  }
}
