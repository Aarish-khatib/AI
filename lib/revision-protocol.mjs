export function payloadEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function decideRevisionMerge(local, incoming, equal = payloadEqual) {
  if (!local) return "insert";
  if (incoming.revision > local.revision) return "replace-and-recover-local";
  if (incoming.revision < local.revision) return "keep-local";
  return equal(local, incoming) ? "same" : "preserve-branch";
}

export function remoteWriteResult(local, remote, applied, equal = payloadEqual) {
  if (applied) return "uploaded";
  if (!remote) return "retry";
  if (remote.revision > local.revision) return "download-remote";
  if (remote.revision === local.revision && !equal(local, remote.payload)) {
    return "preserve-local-conflict";
  }
  return "retry";
}
