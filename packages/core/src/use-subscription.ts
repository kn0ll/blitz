import {SubscriptionFunction} from "./types"
import {sanitize} from "./utils/react-query-utils"

export const useSubscription = <TResult, TVariables>(
  subscriptionResolver: SubscriptionFunction<TResult, TVariables>,
): TResult => {
  // console.log('222', subscriptionResolver)
  const enhancedResolverRpcClient = sanitize(subscriptionResolver)
  console.log("333", enhancedResolverRpcClient._meta)
  // @ts-ignore
  return 4
}
