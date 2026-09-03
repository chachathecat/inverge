/*
 * S236B fixture-execution egress guard.
 *
 * This benchmark-only LD_PRELOAD library denies IPv4 and IPv6 socket
 * creation. Local Unix sockets remain available to native libraries.
 */
#define _GNU_SOURCE

#include <dlfcn.h>
#include <errno.h>
#include <netdb.h>
#include <stdarg.h>
#include <sys/socket.h>

typedef int (*socket_fn)(int, int, int);

int socket(int domain, int type, int protocol) {
  static socket_fn real_socket = 0;
  if (domain == AF_INET || domain == AF_INET6) {
    errno = EPERM;
    return -1;
  }
  if (!real_socket) {
    real_socket = (socket_fn)dlsym(RTLD_NEXT, "socket");
  }
  if (!real_socket) {
    errno = ENOSYS;
    return -1;
  }
  return real_socket(domain, type, protocol);
}

int getaddrinfo(const char *node, const char *service,
                const struct addrinfo *hints, struct addrinfo **result) {
  (void)node;
  (void)service;
  (void)hints;
  (void)result;
  return EAI_FAIL;
}
