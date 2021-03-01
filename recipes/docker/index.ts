import {RecipeBuilder} from "@blitzjs/installer"
import {join} from "path"

export default RecipeBuilder()
  .setName("Docker")
  .setDescription("")
  .setOwner("b@bayer.ws")
  .setRepoLink("https://github.com/blitz-js/blitz")
  .addNewFilesStep({
    stepId: "addFiles",
    stepName: "Add Docker files",
    explanation: `Adds files for development and production Docker support`,
    // explanation: `NOTE: Your app must be configured to use Postgres for this render.yaml config`,
    targetDirectory: ".",
    templatePath: join(__dirname, "templates"),
    templateValues: {},
  })
  .build()
