var socket = io();

var helloApp = angular.module("helloApp", ['ui']);

helloApp.controller("MixerCtrl", function($scope, $http) {

	$scope.notifications = [];
	$scope.queue = [];

	socket.on('current queue', function(queue){
		console.log('queue:', queue);
		$scope.queue = queue;
		$scope.$apply()
	});

	socket.on('notification', function(notif){
		var id = $scope.notifications.length;
		$scope.notifications.push({header: notif.header, message: notif.message});

		setTimeout(function(){delete $scope.notifications[id];}, 10000);
	});
});
