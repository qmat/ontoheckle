var objectsWithInstantsArray = new Array();
var objectsWithIntervalsArray = new Array();
var eventSecsArray = new Array();

function eventSecs()
{
	return eventSecsArray;
}

function handleEventAtSec(time)
{
	console.log("Handling event at time: " + time)
	var workingTime;
	var i;

	if (objectsWithInstantsArray.length > 0)
	{
		workingTime = 0;
		i = 0;
		while (workingTime <= time)
		{
			workingTime = objectsWithInstantsArray[i].atTime;
			
			if (time == workingTime)
			{
				console.log("At this instant: " + objectsWithInstantsArray[i].url);
				
				// Start downloading the object from the triplestore
				subjectQuery(objectsWithInstantsArray[i].url);
				
				// Tell the display...
				p.triggerObjectWithInstant(objectsWithInstantsArray[i].url);
			}
			
			i++;
		}
	}
	
	if (objectsWithIntervalsArray.length > 0)
	{	
		workingTime = 0;
		i = 0;
		while (workingTime <= time)
		{
			workingTime = objectsWithIntervalsArray[i].beginTime;
	
			if (time == workingTime)
			{
				console.log("Begins: " + objectsWithIntervalsArray[i].url);
				
				// Start downloading the object from the triplestore
				subjectQuery(objectsWithIntervalsArray[i].url);
				
				// Tell the display...
				p.triggerObjectWithInterval(objectsWithIntervalsArray[i].url, true);
				
			}
			
			i++;
		}
		
		workingTime = 0;
		i = 0;
		while (workingTime <= time)
		{
			workingTime = objectsWithIntervalsArray[i].endTime;
	
			if (time == workingTime)
			{
				console.log("Ends: " + objectsWithIntervalsArray[i].url);
				
				// Tell the display...
				p.triggerObjectWithInterval(objectsWithIntervalsArray[i].url, false);
			}
			
			i++;
		}
	}
}

// A look-up table for any special-case object type names 
var translateTable = {
	"http://contextus.net/itemOntologyPlaceholder/item" : "Item",
	"http://www.geonames.org/ontology#Feature" : "Location",
	"http://xmlns.com/foaf/0.1/Agent" : "Character",
	"http://theps.net/ho/heckle/Heckle" : "Audience Heckle",
	  }

function extractLastPathElement(path)
{
	index = path.lastIndexOf('#');
	if (index == -1) index = path.lastIndexOf('/');
	// might also have to check that its not a trailing slash
	return path.substring(index+1);
}

function textFromURI(URI)
{
	var text = translateTable[URI];
					
	if (typeof text == 'undefined') text = extractLastPathElement(URI);
	
	return text;
}

function subjectQuery(subject)
{ 
	// TASK Defensive clause: check that this query hasn't already been actioned
	if (subject in window.downloadedObjectsActioned)
		return;
	else
		window.downloadedObjectsActioned[subject] = new Date();
	
	// TASK Create SPARQL query to return all propery and object pairs for the object
	
	// The trick is to aggregate in all ordered list information, which means catching any associated slot nodes. 
	var query = "SELECT * WHERE { ";
	query +=	"<" + subject + "> ?p ?o . ";
	query +=	"OPTIONAL { ";
	query +=	"?o <http://purl.org/ontology/stories/slot> ?slot . ";
	query += 	"?slot <http://purl.org/ontology/olo/core#index> ?index . ";
	query +=	"?slot <http://purl.org/ontology/stories/item> ?item . ";
	query +=	"}}";
	
	// TASK Run the 'objectQuery' query, and set up 'objectReturn' callback for when the results arrive.
	window.sparqler.query(query, {failure: window.onFailure, success: function(json) {objectReturn(subject,json.results.bindings);}});
}

function objectQuery(object)
{ 
	// TASK Create SPARQL query to return all objects for the subject
	
	// The trick is to aggregate in all time information 
	var query = "SELECT * WHERE { ";
	query +=	"?s ?p <" + object + "> . ";
	query +=	"OPTIONAL { ";
	query +=	"?subjectWithTime ?timeP ?s . ";
	query += 	"?s <http://purl.org/NET/c4dm/timeline.owl#atInt> ?atTime . ";
	query +=	"}";
	query +=	"OPTIONAL { ";
	query +=	"?subjectWithTime ?timeP ?s . ";
	query += 	"?s <http://purl.org/NET/c4dm/timeline.owl#beginsAtInt> ?beginTime . ";
	query += 	"?s <http://purl.org/NET/c4dm/timeline.owl#endsAtInt> ?endTime .  ";
	query +=	"}}";
	
	// TASK Run the 'objectQuery' query, and set up 'objectReturn' callback for when the results arrive.
	window.sparqler.query(query, {failure: window.onFailure, success: function(json) {subjectsReturn(object,json.results.bindings);}});
}

function objectReturn(subject,propertyArray)
{
	// CREATE INFO+PROPERTY DATA OBJECT FOR OBJECT NAME
	// AGGREGATE bNODES; CREATE INFO TEXT; ETC.
	// object.property1.arrayOfObjects
	// object.property..arrayOfObjects
	// object.propertyn.arrayOfOjects
	// object.text.textObject
	
	// TASK Create new object to hold our assembled object
	
	var returnObject = new Object();
	
	// TASK Find its type and add to returnObject
	
	// This assumes there is only one type property for the object, which if not the case shows there is a problem in the source RDF
	for (i = 0; i < propertyArray.length; i++)
		if (propertyArray[i].p.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") returnObject["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] = propertyArray[i].o.value;
	
	// TASK If it has a type, we can visualise it, and so need to parse those properties.
	
	if ("http://www.w3.org/1999/02/22-rdf-syntax-ns#type" in returnObject) 
	{
		// TASK Deal with special case types
		
		// Stories have event lists, which handle an ordered list via triples using bNodes. These should be fetched and become an array property of a Story.
		if (returnObject["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] == "http://purl.org/ontology/stories/Story")
		{
			// The EventList is an unordered list of bNodes containing a position index and object
			// Thanks to the SPARQL query, its easy to deal with
			// ?p	?o	?slot	?index	?item
			// <http://purl.org/ontology/stories/events>	<http://contextus.net/who/s4e1/canonicalStoryEvents>	_:b1	"1"^^<http://www.w3.org/2001/XMLSchema#integer>	<http://contextus.net/who/s4e1/building_entry>
			
			// Split the slot bNodes out into a separate array, slotNodesArray
			var slotNodesArray = new Array();
			var i = 0;
			while (i < propertyArray.length)
			{
				if (propertyArray[i].p.value == "http://purl.org/ontology/stories/events")
				{
					// Move the event list object across
					// we want the single object, not an array from i to length 		
					slotNodesArray.push(propertyArray.splice(i,1)[0]);
				}
				else i++;
			}			
						
			// Parse the eventListArray together from each slot node's index and item properties
			var eventListArray = Array(slotNodesArray.length);
			slotNodesArray.forEach( function(element, index) { eventListArray[element.index.value] = element.item.value; } );				
			
			returnObject["http://purl.org/ontology/stories/events"] = eventListArray;
		}
		
		// TASK Parse properties into properties to link between and properties to be displayed within the object
		
		// Our human-readable text for display within the object
		var textObject = new Object();
		
		// Iterate through properties of each node
		for (i = 0; i < propertyArray.length; i++)
		{
			property = propertyArray[i].p.value;
			
			// Merge in these properties to the node
			if (property == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
			{
				// Shouldn't we be going to the URL and getting the RDF label? XSS...
				textObject.type = {title : "Type: ", text : textFromURI(propertyArray[i].o.value)};
			}
			else if (property == "http://www.w3.org/2000/01/rdf-schema#label")
			{
				textObject.about = {title : "About: ", text : propertyArray[i].o.value};
			}
			else if (property == "http://xmlns.com/foaf/0.1/name")
			{
				textObject.name = {title : "Name: ", text : propertyArray[i].o.value};
			}
			else if (property == "http://www.w3.org/2000/01/rdf-schema#comment")
			{
				textObject.comment = {title : "Comment: ", text : propertyArray[i].o.value};
			}
			else if (property == "http://purl.org/ontology/po/time" || property == "http://theps.net/ho/heckle/time")
			{
				// Drop it! (No display)
			}
			// Make these sub-nodes
			else
			{
				// Add the object to the property's list, creating the list if need be.
				if (property in returnObject)
				{
					returnObject[property].push(propertyArray[i].o.value);
				}
				else
				{
					objectArray = [ propertyArray[i].o.value ];
					returnObject[property] = objectArray;
				}
			}
		}
		if (textObject) 
		{
			var lineCount = 0;
			for (var key in textObject) {lineCount++};
			textObject.lineCount = lineCount;
			returnObject.text = textObject;
		}
	}
	else
	{
		console.log("No type returned for object: " + subject)
	}
	
	// TASK Make the object available
	
	// Name our assembled object and put it on the global list of downloaded, parsed objects
	window.downloadedObjects[String(subject)] = returnObject;
	
	// Call the global callback
	window.objectDownloadedCallback(String(subject));
	
	console.log(window.downloadedObjects)
}

function subjectsReturn(object,propertyArray)
{
	// CREATE INFO+PROPERTY DATA OBJECT FOR OBJECT NAME
	// AGGREGATE bNODES; CREATE INFO TEXT; ETC.
	// object.property1.arrayOfObjects
	// object.property..arrayOfObjects
	// object.propertyn.arrayOfOjects
	// object.text.textObject
	
	// TASK Create new object to hold our assembled object
	
	var returnObject = new Object();
	
	// TASK Handle timeline aggregation special case.
	
	// Note more general purpose would be: if a predicate of object is timeline:timeline
	if (object == "http://contextus.net/who/s4e1/programmeTimeline")
	{
		// Loop through the SPARQL results picking out objects with intervals and instants

		propertyArray.forEach( function(element, index) 
		{ 
			// This will be an object with an instant
			if (element.atTime.hasOwnProperty("value"))
			{
				var object = new Object();
				object.atTime = parseInt(element.atTime.value);
				object.url = element.subjectWithTime.value;
				objectsWithInstantsArray.push(object);
				
				eventSecsArray.push(parseInt(element.atTime.value))
			}
			
			// This will be an object with an interval
			if (element.beginTime.hasOwnProperty("value"))
			{
				var object = new Object();
				object.beginTime = parseInt(element.beginTime.value);
				object.endTime = parseInt(element.endTime.value);
				object.url = element.subjectWithTime.value;
				objectsWithIntervalsArray.push(object);
				
				eventSecsArray.push(parseInt(element.beginTime.value));
				eventSecsArray.push(parseInt(element.endTime.value))
			}
		} );

		// sorting now should allow optimisation later
		objectsWithInstantsArray.sort(function(a,b) {return a.atTime - b.atTime});
		objectsWithIntervalsArray.sort(function(a,b) {return a.beginTime - b.beginTime});
		
		// sort and remove duplicate times
		eventSecsArray.sort(function(a,b) {return a - b});
		var i = 1;
		while (i < eventSecsArray.length)
		{
			if (eventSecsArray[i-1] == eventSecsArray[i]) eventSecsArray.splice(i,1);
			else i++;
		}
		
		console.log(eventSecsArray);
	}

	return;

}