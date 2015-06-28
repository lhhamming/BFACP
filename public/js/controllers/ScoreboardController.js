angular.module('bfacp').controller('ScoreboardController', ['$scope', '$rootScope', '$http', '$timeout', '$location', '$idle', '$modal', 'SBA',
    function($scope, $rootScope, $http, $timeout, $location, $idle, $modal, SBA) {

        // How often the data should be fetched in seconds
        var refresh = 10;
        var refreshTimeout;
        var requestErrorCount = 0;

        // Idle Detector
        $scope.idleStarted = false;
        $scope.idleWarning = null;
        $scope.idleTimedOut = null;
        $scope.idleServerId = null;

        function closeModels() {
            if ($scope.idleWarning) {
                $scope.idleWarning.close();
                $scope.idleWarning = null;
            }

            if ($scope.idleTimedOut) {
                $scope.idleTimedOut.close();
                $scope.idleTimedOut = null;
            }
        }

        $scope.$on('$idleStart', function() {
            closeModels();

            $scope.idleWarning = $modal.open({
                templateUrl: 'warning-dialog.html',
                windowClass: 'modal-warning'
            });
        });

        $scope.$on('$idleEnd', function() {
            closeModels();

            if ($scope.idleServerId !== null) {
                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.selectedId = $scope.idleServerId;
                        $scope.idleServerId = null;
                    });

                    $scope.switchServer();
                }, 100);
            }
        });

        $scope.$on('$idleTimeout', function() {
            closeModels();

            setTimeout(function() {
                $scope.$apply(function() {
                    $scope.idleServerId = $scope.selectedId;
                    $scope.selectedId = -1;
                    $scope.roundId = null;
                });

            }, 100);

            $scope.disableServerRequests();

            $scope.idleTimedOut = $modal.open({
                templateUrl: 'timedout-dialog.html',
                windowClass: 'modal-danger'
            });
        });

        $scope.$watch('selectedId', function() {
            if ($scope.selectedId != -1) {
                if (!$scope.idleStarted) {
                    $idle.watch();
                    $scope.idleStarted = true;
                }
            } else {
                if ($scope.idleStarted && $scope.idleServerId !== null) {
                    // Do nothing
                    return false;
                }

                $idle.unwatch();
                $scope.idleStarted = false;
            }
        });

        // Init vars
        $scope.loading = false;
        $scope.refresh = false;
        $scope.requestError = false;
        $scope.selectedId = -1;
        $scope.roundId = null;

        $scope.alerts = [];

        $scope.sort = {
            column: 'score',
            desc: true
        };

        $scope.server = [];
        $scope.teams = [];
        $scope.netural = [];
        $scope.messages = [];
        $scope.winning = {
            '1': false,
            '2': false,
            '3': false,
            '4': false
        };

        $scope.search = {
            chat: '',
            scoreboard: ''
        };

        var addAlert = function(message, alertType) {
            $scope.alerts.push({
                msg: message,
                type: alertType
            });
        };

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        $scope.disableServerRequests = function() {
            $scope.loading = false;
            $scope.refresh = false;
            $scope.server = [];
            $scope.teams = [];
            $scope.netural = [];
            $scope.messages = [];
            $location.hash('');

            if ($scope.requestError) {
                $scope.requestError = false;
            }

            $timeout.cancel(refreshTimeout);
        };

        $scope.switchServer = function() {
            $scope.loading = true;
            $scope.refresh = true;
            $scope.server = [];
            $scope.teams = [];
            $scope.netural = [];
            $scope.messages = [];

            if ($scope.selectedId == -1) {
                $location.hash('');
            } else {
                $location.hash('id-' + $scope.selectedId);
            }

            if ($scope.requestError) {
                $scope.requestError = false;
            }

            $timeout.cancel(refreshTimeout);
            $timeout($scope.fetchServerData, 500);
            $scope.fetchRoundStats();
        };

        $scope.kd = function(kills, deaths) {
            var ratio = $rootScope.divide(kills, deaths);

            if (kills === 0 && deaths > 0) {
                ratio = -deaths.toFixed(2);
            }

            return ratio;
        };

        $scope.avg = function(items, prop, precision) {
            if (items === null) {
                return 0;
            }

            var sum = $scope.sum(items, prop);

            return $rootScope.divide(sum, items.length, precision || 0);
        };

        $scope.sum = function(items, prop) {
            if (items === null) {
                return 0;
            }

            return items.reduce(function(a, b) {
                return b[prop] === null ? a : a + b[prop];
            }, 0);
        };

        $scope.pingColor = function(ping) {
            if (ping === null) {
                return 'bg-blue';
            }

            var color;

            if (ping < 140) {
                color = 'bg-green';
            } else if (ping >= 140 && ping < 250) {
                color = 'bg-yellow';
            } else if (ping >= 250 && ping < 65535) {
                color = 'bg-red';
            }

            return color;
        };

        $scope.setWinningTeam = function() {
            var team1 = $scope.teams[1] || {
                score: null
            };
            var team2 = $scope.teams[2] || {
                score: null
            };
            var team3 = $scope.teams[3] || {
                score: null
            };
            var team4 = $scope.teams[4] || {
                score: null
            };
            var tickets_needed = $scope.server.tickets_needed;
            var tickets_starting = $scope.server.tickets_starting;
            var mode = $scope.server.mode;
            var num = null;

            if (tickets_needed == null || mode.uri == "RushLarge0" || mode.uri == "Heist0") {
                $scope.winning[1] = false;
                $scope.winning[2] = false;
                $scope.winning[3] = false;
                $scope.winning[4] = false;

                return false;
            }

            var teamTickets = [];

            if (team1.score !== null) {
                teamTickets.push(team1.score);
            }

            if (team2.score !== null) {
                teamTickets.push(team2.score);
            }

            if (team3.score !== null) {
                teamTickets.push(team3.score);
            }

            if (team4.score !== null) {
                teamTickets.push(team4.score);
            }

            if (tickets_needed > 0) {
                if (mode.uri == "TeamDeathMatch0" || mode.uri == "BloodMoney0") {
                    num = Math.max.apply(null, teamTickets);
                } else {
                    num = Math.min.apply(null, teamTickets);
                }

            } else {
                num = Math.max.apply(null, teamTickets);
            }

            switch (mode.uri) {
                case "Domination0":
                case "Obliteration":
                case "Chainlink0":
                case "ConquestLarge0":
                case "ConquestSmall0":
                case "TeamDeathMatch0":
                case "TurfWarLarge0":
                case "TurfWarSmall0":
                case "Heist0":
                case "Hotwire0":
                case "BloodMoney0":
                case "Hit0":
                case "Hostage0":
                    if (team1.score < 0 || team2.score < 0) {
                        return false;
                    }

                    if (team1.score == team2.score) {
                        $scope.winning[1] = false;
                        $scope.winning[2] = false;
                    } else if (num == team1.score) {
                        $scope.winning[1] = true;
                        $scope.winning[2] = false;
                    } else if (num == team2.score) {
                        $scope.winning[1] = false;
                        $scope.winning[2] = true;
                    }
                    break;

                case "SquadDeathMatch0":

                    // Team 1 Is Winning
                    if (team1.score > team2.score && team1.score > team3.score && team1.score > team4.score || num == team1.score) {
                        $scope.winning[1] = true;
                        $scope.winning[2] = false;
                        $scope.winning[3] = false;
                        $scope.winning[4] = false;
                    }

                    // Team 2 Is Winning
                    else if (team2.score > team1.score && team2.score > team3.score && team2.score > team4.score || num == team2.score) {
                        $scope.winning[1] = false;
                        $scope.winning[2] = true;
                        $scope.winning[3] = false;
                        $scope.winning[4] = false;
                    }

                    // Team 3 Is Winning
                    else if (team3.score > team1.score && team3.score > team2.score && team3.score > team4.score || num == team3.score) {
                        $scope.winning[1] = false;
                        $scope.winning[2] = false;
                        $scope.winning[3] = true;
                        $scope.winning[4] = false;
                    }

                    // Team 4 Is Winning
                    else if (team4.score > team1.score && team4.score > team2.score && team4.score > team3.score || num == team4.score) {
                        $scope.winning[1] = false;
                        $scope.winning[2] = false;
                        $scope.winning[3] = false;
                        $scope.winning[4] = true;
                    }
                    break;

                default:
                    console.debug('Unknown gametype: ' + mode.uri);
                    break;
            }
        };

        $scope.fetchServerData = function() {
            if ($scope.selectedId == -1) {
                $scope.loading = false;
                $scope.refresh = false;
                return false;
            }

            if (!$scope.loading) {
                $scope.loading = true;
            }

            $scope.refresh = true;

            $http({
                url: 'api/servers/scoreboard/' + $scope.selectedId,
                method: 'GET',
                params: {}
            }).success(function(data, status) {
                if ($scope.alerts.length > 0) {
                    $scope.alerts = [];
                }

                $scope.server = data.data.server;
                $scope.teams = data.data.teams;
                $scope.setWinningTeam();

                if (data.data.teams[0] !== undefined || data.data.teams[0] !== null) {
                    $scope.netural = data.data.teams[0];
                    delete $scope.teams[0];
                }

                $scope.refresh = false;

                if ($scope.requestError) {
                    $scope.requestError = false;
                    requestErrorCount = 0;
                }

                var chart = $("#round-graph").highcharts();

                if (
                    ($scope.server.mode.uri == 'RushLarge0' || $scope.server.mode.uri == 'Heist0') && (chart.series[1] !== undefined || chart.series[1] !== null) && chart.series[1].visible) {
                    chart.series[1].hide();
                }

                refreshTimeout = $timeout($scope.fetchServerData, refresh * 1000);
            }).error(function(data, status) {
                if (status == 410) {
                    $scope.refresh = false;
                    $scope.loading = false;
                    addAlert(data.message, 'danger');
                    setTimeout(function() {
                        $scope.$apply(function() {
                            $scope.selectedId = -1;
                        });
                    }, 800);

                    return false;
                }

                if (status == 500) {
                    requestErrorCount++;
                }

                if (requestErrorCount > 4) {
                    $scope.refresh = false;
                    $scope.loading = false;
                    $scope.requestError = true;
                    addAlert(data.message, 'danger');
                    return false;
                }

                $scope.fetchServerData();
            });

            $scope.fetchServerChat();
        };

        $scope.fetchServerChat = function() {
            if ($scope.selectedId == -1) {
                $scope.messages = [];
                return false;
            }

            $http({
                url: 'api/servers/chat/' + $scope.selectedId,
                method: 'GET',
                params: {
                    sb: 1,
                    nospam: 1
                }
            }).success(function(data, status) {
                $scope.messages = data.data;
            }).error(function(data, status) {
                $timeout($scope.fetchServerChat, 2 * 1000);
            });
        };

        $scope.colSort = function(col) {
            var sort = $scope.sort;

            if (sort.column == col) {
                sort.desc = !sort.desc;
            } else {
                sort.column = col;
                sort.desc = false;
            }
        };

        $scope.colSortClass = function(col) {
            var cssClass = '';

            if ($scope.sort.column == col) {
                if ($scope.sort.desc) {
                    cssClass = 'fa fa-sort-desc';
                } else {
                    cssClass = 'fa fa-sort-asc';
                }
            } else {
                cssClass = 'fa fa-sort';
            }

            return cssClass;
        };

        $scope.isSelectAll = function(e) {
            var table = $(e.target).closest('table');
            if ($('thead th input:checkbox', table).is(':checked')) {
                $('thead th input:checkbox', table).prop('checked', false);
            }
        }

        $scope.selectAll = function(e) {
            var table = $(e.target).closest('table');
            $('tbody td input:checkbox', table).prop('checked', e.target.checked);
        };

        $scope.fetchRoundStats = function() {
            var chart = $("#round-graph").highcharts();
            if ($scope.selectedId == -1 || $scope.requestError) {
                return false;
            }

            $http({
                url: 'api/servers/scoreboard/roundstats/' + $scope.selectedId,
                method: 'GET',
                params: {}
            }).success(function(data, status) {
                for (var i = 0; i < data.data.stats.length; i++) {
                    if (chart.series[i] === undefined || chart.series[i] === null) {
                        chart.addSeries(data.data['stats'][i]);
                    } else {
                        if ($scope.roundId != data.data.roundId) {
                            chart.series[i].setData([]);
                        }

                        chart.series[i].setData(data.data['stats'][i].data);
                    }
                }

                chart.redraw();

                $timeout($scope.fetchRoundStats, 30 * 1000);
            }).error(function(data, status) {
                $timeout($scope.fetchRoundStats, 2 * 1000);
            });
        };

        $("#round-graph").highcharts({
            chart: {
                type: 'spline',
                zoomType: 'x'
            },
            title: {
                text: 'Round Stats'
            },
            subtitle: {
                text: 'Times shown in UTC'
            },
            xAxis: {
                type: 'datetime',
                title: {
                    text: 'Time'
                }
            },
            yAxis: {
                title: {
                    text: ''
                },
                min: 0
            },
            tooltip: {
                headerFormat: '<b>{series.name}</b> - <small>{point.x:%H:%M:%S}</small><br>',
                pointFormat: '{point.y}'
            },
            plotOptions: {
                spline: {
                    marker: {
                        enabled: true
                    },
                    dataLabels: {
                        enabled: true
                    }
                }
            },
            series: []
        });

        if ($location.hash() !== '') {
            var path = $location.hash().split('-');
            $scope.selectedId = parseInt(path[1], 10);
            $scope.switchServer();
        };

        /**
         * Admin functionality
         */
    }
]);