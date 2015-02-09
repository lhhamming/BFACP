angular.module('bfacp', [
        'ngResource',
        'ngMessages',
        'ngAnimate',
        'ngAria',
        'ngSanitize',
        'ui.bootstrap',
        'countTo'
    ])
    .config(['$locationProvider', function($locationProvider) {
        $locationProvider.html5Mode(true);
    }])
    .run(['$rootScope', function($rootScope) {
        $rootScope.moment = function(date) { return moment(date); };
    }])
    .filter('nl2br', function() {
        var span = document.createElement('span');
        return function(input) {
            if (!input) return input;
            var lines = input.split('\n');

            for (var i = 0; i < lines.length; i++) {
                span.innerText = lines[i];
                span.textContent = lines[i];  //for Firefox
                lines[i] = span.innerHTML;
            }
            return lines.join('<br />');
        }
    })
    .filter('range', function() {
        return function(input, low, high, step) {
            //  discuss at: http://phpjs.org/functions/range/
            // original by: Waldo Malqui Silva
            //   example 1: range ( 0, 12 );
            //   returns 1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
            //   example 2: range( 0, 100, 10 );
            //   returns 2: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
            //   example 3: range( 'a', 'i' );
            //   returns 3: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
            //   example 4: range( 'c', 'a' );
            //   returns 4: ['c', 'b', 'a']

            var matrix = [];
            var inival, endval, plus;
            var walker = step || 1;
            var chars = false;

            if (!isNaN(low) && !isNaN(high)) {
              inival = low;
              endval = high;
            } else if (isNaN(low) && isNaN(high)) {
              chars = true;
              inival = low.charCodeAt(0);
              endval = high.charCodeAt(0);
            } else {
              inival = (isNaN(low) ? 0 : low);
              endval = (isNaN(high) ? 0 : high);
            }

            plus = ((inival > endval) ? false : true);
            if (plus) {
              while (inival <= endval) {
                matrix.push(((chars) ? String.fromCharCode(inival) : inival));
                inival += walker;
              }
            } else {
              while (inival >= endval) {
                matrix.push(((chars) ? String.fromCharCode(inival) : inival));
                inival -= walker;
              }
            }

            return matrix;
        };
    })
    .controller('DashboardController', ['$scope', '$http', '$interval', function($scope, $http, $interval) {
        $scope.results = {
            bans: {
                columns: [],
                data: []
            },
            population: {
                columns: [],
                title: '',
                footer: '',
                old: {
                    online: 0,
                    total: 0
                },
                online: 0,
                total: 0,
                percentage: 0,
                data: []
            },
            banstats: {
                yesterday: 0,
                average: 0
            }
        };

        $scope.opts = {
            bans: {
                personal: false
            }
        };

        $scope.loaded = {
            bans: false
        };

        $scope.$watch('results.population.online', function(newValue, oldValue) {
            $scope.results.population.old.online = oldValue;
        });

        $scope.$watch('results.population.total', function(newValue, oldValue) {
            $scope.results.population.old.total = oldValue;
        });

        /**
         * Fetchs the latest bans. If personal is true only fetch the users issued bans.
         * @return void
         */
        $scope.latestBans = function() {
            if($scope.loaded.bans) {
                $("#latest-ban-refresh-btn").addClass('fa-spin');
                $scope.loaded.bans = false;
            }

            $http({
                url: 'api/bans/latest',
                method:'GET',
                params:{
                    personal: $scope.opts.bans.personal
                }
            }).success(function(data, status) {
                $scope.results.bans.columns = data.data.cols;
                $scope.results.bans.data = data.data.bans;
                $scope.loaded.bans = true;
                $("#latest-ban-refresh-btn").removeClass('fa-spin');
            }).error(function(data, status) {
                $scope.latestBans();
            });
        };

        /**
         * Fetchs the population statistics
         * @return void
         */
        $scope.population = function() {
            $http.get('api/servers/population').success(function(data, status) {
                $scope.results.population.data = data.data.games;
                $scope.results.population.online = data.data.online;
                $scope.results.population.total = data.data.totalSlots;
                $scope.results.population.percentage = data.data.percentage;
                $scope.results.population.columns = data.data.columns;
                $scope.results.population.title = data.data.title;
                $scope.results.population.footer = data.data.footer;
            }).error(function(data, status) {
                $scope.population();
            });
        };

        /**
         * Fetchs the ban statistics
         * @return void
         */
        $scope.banStats = function() {
            $http.get('api/bans/stats').success(function(data, status) {
                $scope.results.banstats.yesterday = data.data.bans.yesterday;
                $scope.results.banstats.average = data.data.bans.average;
            }).error(function(data, status) {
                $scope.banStats();
            });
        };

        /**
         * Returns the class based on percentage number
         * @param  integer pct   Percentage
         * @param  boolean usebg Prepend bg- to the class if true
         * @return string        Class Name
         */
        $scope.populationColor = function(pct, usebg) {
            var classColor;

            if(pct <= 30) {
                classColor = usebg ? 'red' : 'danger';
            } else if(pct > 30 && pct <= 80) {
                classColor = usebg ? 'blue' : 'warning';
            } else if(pct > 80) {
                classColor = usebg ? 'green' : 'success';
            }

            if(usebg) {
                classColor = 'bg-' + classColor;
            }

            return classColor;
        };

        // Re-fetch the population every 30 seconds
        $interval($scope.population, 30 * 1000);

        $scope.latestBans();
        $scope.population();
        $scope.banStats();

    }])
    .controller('PlayerListController', ['$scope', '$http', '$location', function($scope, $http, $location) {

        $scope.players = [];
        $scope.alerts = [];

        $scope.loaded = false;

        $scope.main = {
            page: 1,
            last_page: 2,
            take: 30,
            total: null
        };

        $scope.reputation = function(val) {
            val = parseFloat(val);
            var className = '';
            if(val === 0) {
                className = 'label-default';
            } else if(val > 0 && val <= 70) {
                className = 'bg-light-blue';
            } else if(val > 70) {
                className = 'label-success';
            } else if(val < 0 && val >= -70) {
                className = 'label-warning';
            } else if(val < -70) {
                className = 'label-danger';
            }

            return className;
        }

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        $scope.$watch('main.page', function(newVal, oldVal) {
            if($scope.main.page > $scope.main.last_page && $scope.main.total !== null) {
                $scope.main.page = oldVal;
            }
        });

        $scope.getListing = function() {

            if($scope.main.page > $scope.main.last_page && $scope.main.total !== null) {
                $scope.alerts.push({
                    type: 'danger',
                    msg: 'You can\'t go to page ' + $scope.main.page + ' when there  is only ' + $scope.main.last_page + ' page(s).',
                    timeout: 5000
                });

                return false;
            }

            $scope.loaded = false;

            var url = 'api/players?page=' + $scope.main.page + '&limit=' + $scope.main.take;

            if($location.search().player !== undefined) {
                url += '&player=' + $location.search().player;
            }

            $http.get(url).success(function(data, status) {
                $scope.loaded = true;
                $scope.players = data.data.data;
                $scope.main.last_page = data.data.last_page;
                $scope.main.total = data.data.total;
            }).error(function(data, status) {
                $scope.getListing();
            });
        };

        $scope.nextPage = function() {
            if($scope.main.page < $scope.main.last_page) {
                $scope.main.page++;
                $scope.getListing();
            }
        };

        $scope.previousPage = function() {
            if($scope.main.page > 1) {
                $scope.main.page--;
                $scope.getListing();
            }
        };

        $scope.getListing();

    }]);

$('#psearch').submit(function() {
    $(this).find('input:text').each(function() {
        var inputVal = $(this).val();
        $(this).val(inputVal.split(' ').join(''));
    });
});
