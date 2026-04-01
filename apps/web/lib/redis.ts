import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);
export default redis;

export function createSubscriber(): Redis {
  return new Redis(process.env.REDIS_URL!);
}
