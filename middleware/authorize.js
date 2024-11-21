const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
  ],
});
prisma.$on("query", (e) => {
  console.log(`${e.query} ${e.duration}ms`);
});
exports.authorizeWithRole = function authorizeWithRole(requiredPermissions) {
  return async (req, res, next) => {
    console.log("requiredPermissions default", requiredPermissions);
    const userId = req.user.id; // Assuming this is set by your authentication middleware

    console.log("userId", userId);
    try {
      // Fetch user roles and permissions
      const userRolesWithPermissions = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          roles: {
            select: {
              role: {
                select: {
                  permissions: {
                    select: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          subscription: {
            select: {
              plan: {
                select: {
                  planRole: {
                    select: {
                      role: {
                        select: {
                          permissions: {
                            select: {
                              permission: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      console.log("userRolesWithPermissions", userRolesWithPermissions);

      // Flatten the permissions arrays into a single array of permission names
      const permissions = userRolesWithPermissions.roles.flatMap(
        (roleRelation) =>
          roleRelation.role.permissions.map(
            (permissionRelation) => permissionRelation.permission.name
          )
      );

      if (userRolesWithPermissions.subscription.length > 0) {
        userRolesWithPermissions.subscription[0].plan.planRole.length > 0 &&
          userRolesWithPermissions.subscription[0].plan.planRole[0].role.permissions.map(
            (per) => permissions.push(per.permission.name)
          );
      }

      console.log("userPermissions", permissions);

      console.log("requiredPermissions", requiredPermissions);

      if (!requiredPermissions.some((permission) => "ADMIN" === permission)) {
        requiredPermissions.push("ADMIN");
      }

      // Check if user has at least one of the required permissions
      const hasPermission = requiredPermissions.some((requiredPermission) =>
        permissions.includes(requiredPermission)
      );

      if (!hasPermission) {
        // If the user does not have required permissions, return a 403 Forbidden
        return res
          .status(403)
          .json({ message: "Access denied. Missing required permission." });
      }

      next(); // User has required permission(s), proceed to the next middleware
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

exports.authenticateJwt = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    try {
     
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user) {
        console.log("User not found");
        return res.sendStatus(401);
      }

      req.user = user;
      next();
    } catch (e) {
      console.log("JWT verification failed");
      return res.sendStatus(401);
    }
  } else {
    res.sendStatus(401);
  }
};