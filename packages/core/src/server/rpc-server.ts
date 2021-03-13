import {baseLogger, log as displayLog} from "@blitzjs/display"
import chalk from "chalk"
import {deserialize, serialize} from "superjson"
import {
  BlitzApiRequest,
  BlitzApiResponse,
  EnhancedResolver,
  Middleware,
  ResolverResult,
} from "../types"
import {prettyMs} from "../utils/pretty-ms"
import {handleRequestWithMiddleware} from "./middleware"

const resultIsPromise = <TResult>(result: ResolverResult<TResult>): result is Promise<TResult> => {
  return (result as Promise<TResult>).then !== undefined
}

const rpcMiddleware = <TInput, TResult>(
  resolver: EnhancedResolver<TInput, TResult>,
  connectDb?: () => any,
): Middleware => {
  return async (req, res, next) => {
    const log = baseLogger().getChildLogger({prefix: [resolver._meta.name + "()"]})
    const paramsError = (message: string) => {
      const error = {message}
      log.error(error.message)
      res.status(400).json({
        result: null,
        error,
      })
      return next()
    }

    if (req.method === "HEAD") {
      // Warm the lamda and connect to DB
      if (typeof connectDb === "function") {
        connectDb()
      }
      res.status(200).end()
      return next()
    }

    const isPost = req.method === "POST"
    if (req.method === "GET" || isPost) {
      // Handle RPC call

      if (isPost) {
        if (typeof req.body.params === "undefined") {
          return paramsError("Request body is missing the `params` key")
        }
      } else {
        if (typeof req.query.params === "undefined") {
          return paramsError("Request query is missing the `params` key")
        }
      }

      try {
        const paramSrc = isPost ? req.body : req.query
        const data = deserialize({json: paramSrc.params, meta: paramSrc.meta?.params}) as TInput

        log.info(chalk.dim("Starting with input:"), data ? data : JSON.stringify(data))
        const startTime = Date.now()
        const results = resolver(data, res.blitzCtx)

        if (resultIsPromise(results)) {
          const result = await results

          const resolverDuration = Date.now() - startTime
          log.debug(chalk.dim("Result:"), result ? result : JSON.stringify(result))

          const serializerStartTime = Date.now()
          const serializedResult = serialize(result)

          const nextSerializerStartTime = Date.now()
          res.blitzResult = result
          res.json({
            result: serializedResult.json,
            error: null,
            meta: {
              result: serializedResult.meta,
            },
          })
          log.debug(
            chalk.dim(`Next.js serialization:${prettyMs(Date.now() - nextSerializerStartTime)}`),
          )
          const serializerDuration = Date.now() - serializerStartTime
          const duration = Date.now() - startTime

          log.info(
            chalk.dim(
              `Finished: resolver:${prettyMs(resolverDuration)} serializer:${prettyMs(
                serializerDuration,
              )} total:${prettyMs(duration)}`,
            ),
          )
        } else {
          res.setHeader("Access-Control-Allow-Origin", "*")
          res.setHeader("Content-Type", "text/event-stream;charset=utf-8")
          res.setHeader("Cache-Control", "no-cache, no-transform")
          res.setHeader("X-Accel-Buffering", "no")

          res.on("close", async () => await results.return())

          for await (const result of results) {
            const serializedResult = serialize(result)
            res.write(
              `data: ${JSON.stringify({
                result: serializedResult.json,
                error: null,
                meta: {
                  result: serializedResult.meta,
                },
              })}\n\n`,
            )
          }
        }
        displayLog.newline()

        return next()
      } catch (error) {
        if (error._clearStack) {
          delete error.stack
        }
        log.error(error)
        displayLog.newline()

        if (!error.statusCode) {
          error.statusCode = 500
        }

        const serializedError = serialize(error)

        res.json({
          result: null,
          error: serializedError.json,
          meta: {
            error: serializedError.meta,
          },
        })
        return next()
      }
    }

    // Everything else is error
    log.warn(`${req.method} method not supported`)
    res.status(404).end()
    return next()
  }
}

export function rpcApiHandler<TInput, TResult>(
  resolver: EnhancedResolver<TInput, TResult>,
  middleware: Middleware[] = [],
  connectDb?: () => any,
) {
  // RPC Middleware is always the last middleware to run
  middleware.push(rpcMiddleware(resolver, connectDb))

  return (req: BlitzApiRequest, res: BlitzApiResponse) => {
    return handleRequestWithMiddleware(req, res, middleware, {
      throwOnError: false,
    })
  }
}
