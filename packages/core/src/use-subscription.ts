import {useEffect, useMemo, useState} from "react"
import {SubscriptionFunction} from "./types"
import {sanitize} from "./utils/react-query-utils"

export const useSubscription = <TResult, TVariables>(
  subscriptionResolver: SubscriptionFunction<TResult, TVariables>,
): TResult | undefined => {
  const enhancedResolverRpcClient = sanitize(subscriptionResolver)
  const url = useMemo(() => enhancedResolverRpcClient._meta.apiUrl, [enhancedResolverRpcClient])

  const [data, setData] = useState<TResult | undefined>(undefined)
  useEffect(() => {
    const sse = new EventSource(`${url}?params`)

    sse.addEventListener("message", function (e) {
      setData(JSON.parse(e.data).result as TResult)
    })

    return () => {
      sse.close()
    }
  }, [url])

  return data
}
