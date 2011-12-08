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
	
	// TODO: validate service configs against schema
	F5.Services = {
		foursquare: {
			parameters: {
				v: '20111111'
//				client_id: <provided by client>
//				client_secret: <provided by client>								
			},
			venueSearch: {
				protocol: 'https',
				method: 'GET',
				baseUrl: 'api.foursquare.com/v2/venues/search',
				parameterSchema: {},
				responseSchema: {},	
				postprocess: function (response) {
					return response.response.venues;
				}				
			},
			venue: {
				protocol: 'https',
				method: 'GET',
				baseUrl: 'api.foursquare.com/v2/venues/',
				parameterSchema: {},
				responseSchema: {},	
				postprocess: function (response) {
					return response.response.venue;
				}				
			},
			categories: {
				protocol: 'https',
				method: 'GET',
				baseUrl: 'api.foursquare.com/v2/venues/categories',
				parameterSchema: {},
				responseSchema: {},	
				postprocess: function (response) {
					return response.response.categories;
				}								
			}				
		},
		googlePlaces: {
			parameters: {
//				key: <provided by client>
			},				
			search: {
				protocol: 'https',
				method: 'GET',
				baseUrl: 'query.yahooapis.com/v1/public/yql',
				parameters: {
					tableHost: 'http://www.flow5.com',
					tableName: 'table',
					radius: 500
				},
				parameterSchema: {},
				responseSchema: {},	
				query: function (parameters) {
					var query = 'use "';
					query += parameters.tableHost + '/' + parameters.tableName + '.xml";';
					query += 'select * from ' + parameters.tableName + ' where ';
					query += 'location="' + parameters.location + '" and ';
					query += 'key="' + parameters.key + '" and ';
					query += 'radius="' + parameters.radius + '"\n';
										
					return 'q=' + encodeURIComponent(query) + '&format=json&diagnostics=true'; 
				},
				postprocess: function (response) {
					// WTF?
					return response.query.results.result.json.results;
				}				
			}
		}
	};		
	
}());