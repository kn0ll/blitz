export default async function* getServerTime() {
  while (true) {
    yield new Date()
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}
