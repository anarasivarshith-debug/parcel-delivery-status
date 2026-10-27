
(function () {
  "use strict";

  var app = angular.module("parcelApp", []);

  app.controller("ParcelController", [
    "$scope",
    "$http",
    function ($scope, $http) {
      var adminToken = "";

      var API = "/api";

      $scope.currentYear = new Date().getFullYear();

      $scope.parcel = null;
      $scope.trackingInput = "";
      $scope.trackingError = "";
      $scope.progressPercent = 0;

      $scope.isAdmin = false;
      $scope.adminUsername = "";
      $scope.adminPassword = "";
      $scope.adminError = "";
      $scope.adminMessage = "";
      $scope.loginLoading = false;

      $scope.parcels = [];
      $scope.adminSearch = "";
      $scope.statusFilter = "";

      $scope.statuses = [
        "Booked",
        "Order Placed",
        "Picked Up",
        "Shipped",
        "In Transit",
        "Out for Delivery",
        "Delivered"
      ];

      $scope.newParcel = {
        sender: "",
        receiver: "",
        origin: "",
        destination: "",
        expectedDelivery: ""
      };

      $scope.statusUpdate = {
        trackingId: "",
        status: "",
        location: "",
        description: ""
      };

      function normalize(value) {
        return String(value || "")
          .trim()
          .toLowerCase();
      }

      function adminRequestConfig() {
        return {
          headers: {
            "x-admin-token": adminToken
          }
        };
      }

      function handleError(error, fallback) {
        if (
          error &&
          error.data &&
          typeof error.data.message === "string"
        ) {
          return error.data.message;
        }

        if (
          error &&
          error.data &&
          typeof error.data.error === "string"
        ) {
          return error.data.error;
        }

        return fallback;
      }

      function getProgress(status) {
        var progress = {
          "Booked": 10,
          "Order Placed": 15,
          "Picked Up": 30,
          "Shipped": 45,
          "In Transit": 65,
          "Out for Delivery": 85,
          "Delivered": 100
        };

        return progress[status] || 0;
      }

      $scope.statusClass = function (status) {
        return "status-" + normalize(status)
          .replace(/\s+/g, "-");
      };

      $scope.trackParcel = function () {
        var trackingId = String(
          $scope.trackingInput || ""
        ).trim();

        $scope.trackingError = "";
        $scope.parcel = null;
        $scope.progressPercent = 0;

        if (!trackingId) {
          $scope.trackingError =
            "Please enter a tracking ID.";
          return;
        }

        $http.get(
          API + "/parcels/" +
          encodeURIComponent(trackingId)
        ).then(function (response) {
          $scope.parcel = response.data;
          $scope.progressPercent = getProgress(
            response.data.status
          );

          document.getElementById("tracking")
            .scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
        }).catch(function (error) {
          $scope.parcel = null;
          $scope.trackingError = handleError(
            error,
            "Unable to find this parcel. Please check the tracking ID."
          );
        });
      };

      $scope.trackFromAdmin = function (trackingId) {
        $scope.trackingInput = trackingId;
        $scope.trackParcel();
      };

      $scope.adminLogin = function () {
        $scope.adminError = "";
        $scope.adminMessage = "";

        // Read the actual input values as a fallback
        // if the Angular models have not updated yet.
        var username = String(
          $scope.adminUsername ||
          document.getElementById("adminUsername").value ||
          ""
        ).trim();

        var password = String(
          $scope.adminPassword ||
          document.getElementById("adminPassword").value ||
          ""
        );

        if (!username || !password) {
          $scope.adminError =
            "Enter both username and password.";
          return;
        }

        $scope.loginLoading = true;

        $http.post(API + "/admin/login", {
          username: username,
          password: password
        }).then(function (response) {
          adminToken = response.data.token || "";

          if (!adminToken) {
            throw new Error(
              "The server did not return an admin token."
            );
          }

          $scope.isAdmin = true;
          $scope.adminUsername = username;
          $scope.adminPassword = "";
          $scope.adminMessage = "Login successful.";

          return $scope.loadParcels();
        }).catch(function (error) {
          $scope.isAdmin = false;
          adminToken = "";

          $scope.adminError = handleError(
            error,
            error.message ||
            "Login failed. Check your credentials and server."
          );
        }).finally(function () {
          $scope.loginLoading = false;
        });
      };

      $scope.loadParcels = function () {
        if (!adminToken) {
          return Promise.reject(
            new Error("Please sign in again.")
          );
        }

        return $http.get(
          API + "/parcels",
          adminRequestConfig()
        ).then(function (response) {
          $scope.parcels = Array.isArray(response.data)
            ? response.data
            : [];

          return $scope.parcels;
        }).catch(function (error) {
          if (error.status === 401 || error.status === 403) {
            adminToken = "";
            $scope.isAdmin = false;
            $scope.parcels = [];
            $scope.adminError =
              "Your admin session has expired. Please sign in again.";
          } else {
            $scope.adminError = handleError(
              error,
              "Could not load parcel records."
            );
          }

          throw error;
        });
      };

      $scope.adminLogout = function () {
        var config = adminRequestConfig();

        $http.post(
          API + "/admin/logout",
          {},
          config
        ).finally(function () {
          adminToken = "";
          $scope.isAdmin = false;
          $scope.parcels = [];
          $scope.adminSearch = "";
          $scope.statusFilter = "";
          $scope.adminPassword = "";
          $scope.adminError = "";
          $scope.adminMessage = "You have signed out.";
        });
      };

      $scope.addParcel = function () {
        $scope.adminError = "";
        $scope.adminMessage = "";

        var form = $scope.newParcel;

        var payload = {
          sender: String(form.sender || "").trim(),
          receiver: String(form.receiver || "").trim(),
          origin: String(form.origin || "").trim(),
          destination: String(form.destination || "").trim(),
          expectedDelivery: form.expectedDelivery
        };

        if (
          !payload.sender ||
          !payload.receiver ||
          !payload.origin ||
          !payload.destination ||
          !payload.expectedDelivery
        ) {
          $scope.adminError =
            "Please complete all parcel fields.";
          return;
        }

        $http.post(
          API + "/parcels",
          payload,
          adminRequestConfig()
        ).then(function (response) {
          $scope.adminMessage =
            "Parcel created successfully. Tracking ID: " +
            response.data.trackingId;

          $scope.newParcel = {
            sender: "",
            receiver: "",
            origin: "",
            destination: "",
            expectedDelivery: ""
          };

          return $scope.loadParcels();
        }).catch(function (error) {
          $scope.adminError = handleError(
            error,
            "Could not create the parcel."
          );
        });
      };

      $scope.updateParcelStatus = function () {
        $scope.adminError = "";
        $scope.adminMessage = "";

        var trackingId = String(
          $scope.statusUpdate.trackingId || ""
        ).trim();

        var status = String(
          $scope.statusUpdate.status || ""
        ).trim();

        var location = String(
          $scope.statusUpdate.location || ""
        ).trim();

        var description = String(
          $scope.statusUpdate.description || ""
        ).trim();

        if (!trackingId || !status || !location) {
          $scope.adminError =
            "Enter a tracking ID, status, and location.";
          return;
        }

        $http.put(
          API + "/parcels/" +
          encodeURIComponent(trackingId) + "/status",
          {
            status: status,
            location: location,
            description: description
          },
          adminRequestConfig()
        ).then(function () {
          $scope.adminMessage =
            "Parcel status updated successfully.";

          $scope.statusUpdate = {
            trackingId: "",
            status: "",
            location: "",
            description: ""
          };

          return $scope.loadParcels();
        }).catch(function (error) {
          $scope.adminError = handleError(
            error,
            "Could not update parcel status."
          );
        });
      };

      // Returns the final filtered array.
      // Do not use this as a predicate inside Angular's filter pipe.
      $scope.filteredParcels = function () {
        var query = normalize($scope.adminSearch);
        var selectedStatus = normalize($scope.statusFilter);

        return ($scope.parcels || []).filter(function (item) {
          var values = [
            item.trackingId,
            item.sender,
            item.receiver,
            item.origin,
            item.destination
          ];

          var matchesQuery = !query ||
            values.some(function (value) {
              return normalize(value).indexOf(query) !== -1;
            });

          var matchesStatus = !selectedStatus ||
            normalize(item.status) === selectedStatus;

          return matchesQuery && matchesStatus;
        });
      };

      // Restore a session if the server supports this endpoint.
      $http.get(API + "/admin/session").then(function (response) {
        if (response.data && response.data.authenticated) {
          adminToken = response.data.token || "";

          if (adminToken) {
            $scope.isAdmin = true;
            return $scope.loadParcels();
          }
        }
      }).catch(function () {
        // No active session; the user can sign in manually.
      });
    }
  ]);
})();
