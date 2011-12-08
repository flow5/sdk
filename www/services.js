/***********************************************************************************************************************

	Copyright (c) 2011 Paul Greyson

	Permission is hereby granted, free of charge, to any person 
	obtaining a copy of this software and associated documentation 
	files (the "Software"), to deal in the Software without 
	restriction, including without limitation the rights to use, 
	copy, modify, merge, publish, distribute, sublicense, and/or 
	sell copies of the Software, and to permit persons to whom the 
	Software is furnished to do so, subject to the following 
	conditions:

	The above copyright notice and this permission notice shall be 
	included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
	OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
	NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
	HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
	WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
	FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
	OTHER DEALINGS IN THE SOFTWARE.

***********************************************************************************************************************/
/*global F5*/


(function () {	
	
	function yqlStatement(tableHost, tableName, parameters) {
		var statement = 'use "' + tableHost + '/' + tableName + '.xml";';

		statement += 'select * from ' + tableName + ' where ';

		var queryParameters = [];
		F5.forEach(parameters, function (key, value) {
			queryParameters.push(key + '="' + value + '"');
		});
		statement += queryParameters.join(' and ');
		
		return statement;
	}
		
	
	// TODO: validate service configs against schema
	F5.Services = {
		foursquare: {
			protocol: 'https',
			method: 'GET',
			parameters: {
				v: '20111111'
//				client_id: <provided by client>
//				client_secret: <provided by client>								
			},
			venueSearch: {
				baseUrl: 'api.foursquare.com/v2/venues/search',
				parameterSchema: {},
				responseSchema: {},	
				postprocess: function (response) {
					return response.response.venues;
				}				
			},
			venue: {
				baseUrl: 'api.foursquare.com/v2/venues/',
				parameterSchema: {},
				responseSchema: {},	
				postprocess: function (response) {
					return response.response.venue;
				}				
			},
			categories: {
				baseUrl: 'api.foursquare.com/v2/venues/categories',
				parameterSchema: {},
				responseSchema: {},	
				postprocess: function (response) {
					return response.response.categories;
				}								
			}				
		},
		google: {
			parameters: {
//				key: <provided by client>
			},				
			places: {
				protocol: 'https',
				baseUrl: 'query.yahooapis.com/v1/public/yql',
				method: 'GET',
				search: {
					tableHost: 'http://www.flow5.com/yql/google/places',
					tableName: 'search',
					parameters: {
					},
					parameterSchema: {},
					responseSchema: {},	
					query: function (parameters) {
						var statement = yqlStatement(this.tableHost, this.tableName, parameters);
						return 'q=' + encodeURIComponent(statement) + '&format=json&diagnostics=true';
					},
					postprocess: function (response) {
						var results = response.query.results.response.json.results;
						if (!Array.isArray(results)) {
							results = [results];
						}
						return results;
					}				
				},			
				details: {
					tableHost: 'http://www.flow5.com/yql/google/places',
					tableName: 'details',
					parameters: {
						// reference <provided by client>
					},
					parameterSchema: {},
					responseSchema: {},	
					query: function (parameters) {
						var statement = yqlStatement(this.tableHost, this.tableName, parameters);
						return 'q=' + encodeURIComponent(statement) + '&format=json&diagnostics=true';
					},
					postprocess: function (response) {
						return response.query.results.response.json.result;
					}				
				}												
			}
		}
	};		
	
}());