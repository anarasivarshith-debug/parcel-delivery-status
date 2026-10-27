
const app = angular.module("parcelApp", []);

app.controller("ParcelController", function ($scope, $http) {
  $scope.trackingId = "";
  $scope.parcel = null;
  $scope.errorMessage = "";
  $scope.successMessage = "";

  $scope.adminTrackingId = "";
  $scope.newStatus = "";

  // Track a parcel
  $scope.trackParcel = function () {
    const id = ($scope.trackingId || "").trim();

    $scope.parcel = null;
    $scope.errorMessage = "";
    $scope.successMessage = "";

    if (!id) {
      $scope.errorMessage = "Please enter a tracking ID.";
      return;
    }

    $http
      .get("/api/parcels/" + encodeURIComponent(id))
      .then(function (response) {
        $scope.parcel = response.data;

        const trackingSection = document.getElementById("tracking");

        if (trackingSection) {
          trackingSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      })
      .catch(function (error) {
        $scope.errorMessage =
          error.data?.message ||
          "Unable to track this parcel. Please try again.";
      });
  };

  // Count completed shipment milestones
  $scope.completedCount = function () {
    if (!$scope.parcel || !$scope.parcel.history) {
      return 0;
    }

    return $scope.parcel.history.filter(function (item) {
      return item.completed;
    }).length;
  };

  // Style the parcel status badge
  $scope.statusClass = function (status) {
    if (status === "Delivered") {
      return "status-delivered";
    }

    if (status === "Booked") {
      return "status-pending";
    }

    return "";
  };

  // Update a parcel's status
  $scope.updateStatus = function () {
    const id = ($scope.adminTrackingId || "").trim();
    const status = $scope.newStatus;

    $scope.errorMessage = "";
    $scope.successMessage = "";

    if (!id || !status) {
      $scope.errorMessage =
        "Enter a tracking ID and select a status.";
      return;
    }

    $http
      .put(
        "/api/parcels/" + encodeURIComponent(id) + "/status",
        { status: status }
      )
      .then(function (response) {
        $scope.parcel = response.data.parcel;
        $scope.trackingId = id;
        $scope.successMessage = response.data.message;

        $scope.adminTrackingId = "";
        $scope.newStatus = "";
      })
      .catch(function (error) {
        $scope.errorMessage =
          error.data?.message ||
          "Unable to update parcel status.";
      });
  };
});
