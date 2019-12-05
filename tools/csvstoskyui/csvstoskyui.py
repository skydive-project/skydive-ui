import csv
import json
import re
import argparse

"""
The content of topologyrules.conf file includes a python dictionary with the following keys: 

filename    - The name of the file to read the csv information from
              example: "netbox/netbox_sites.csv"
show        - Boolean that enables or disables usage of this csv source
              example: False --> will result in skipping this csv source  
valuesmappingcopy - dictionary of csv values to copy from csv to json
              example: {"group_name": "Name"} --> Copy csv values from column 'group_name' to be called 'Name' in json 
valuesfilter - dictionary of csv values to filter by using regex
              example: "site": ".*ams01" --> Using only csv entries with site equal to regex   
edges        - Create edges between nodes (list of edges)
              example: {"from":["site"], "to": {"site": ["name"]}, "RelationType": "ownership"} --> Will create
              an edge from every entry in csv having 'site' field that is equal to field 'name' in the csv source
              'site' and set RelationType of the edge to be ownership (Note: can be list of fields to compare as needed)
"""


## build nodes
def buildNodes(netboxtopologyfiles):
    jsonnodes = []
    for key in netboxtopologyfiles:
        jsontopology = []
        if not ("show" in netboxtopologyfiles[key]) or not (netboxtopologyfiles[key]["show"]):
            continue

        csv_reader = csv.DictReader(open(netboxtopologyfiles[key]["filename"]))
        for idx, raw in enumerate(csv_reader):
            jsondump = {"Metadata": raw,
                        "ID": (key + "-" + str(idx)),
                        "Origin": "SoftLayer"}
            jsondump["Metadata"].update({"Type": key})
            if "valuesfilter" in netboxtopologyfiles[key]:
                filter_value = False
                for filterkey, filtervalue in netboxtopologyfiles[key]["valuesfilter"].iteritems():
                    try:
                        if not re.search(filtervalue, raw[filterkey]):
                            filter_value = True
                    except TypeError:
                        filter_value = True
                if filter_value:
                    continue
            if "valuesmappingcopy" in netboxtopologyfiles[key]:
                for mapkey, mapvalue in netboxtopologyfiles[key]["valuesmappingcopy"].iteritems():
                    jsondump["Metadata"][mapvalue] = jsondump["Metadata"][mapkey]
            jsontopology.append(jsondump)
        jsonnodes += jsontopology
    return jsonnodes


## build edges
def buildEdges(netboxtopologyfiles, jsonnodes):
    jsonedges = []
    for key in netboxtopologyfiles:
        jsontopology = []
        if not ("show" in netboxtopologyfiles[key]) or not (netboxtopologyfiles[key]["show"]):
            continue

        if not ("edges" in netboxtopologyfiles[key]) or not (netboxtopologyfiles[key]["edges"]):
            continue

        edges = netboxtopologyfiles[key]["edges"]
        for idx, edge in enumerate(edges):
            relationType = edge["RelationType"]
            fromtype = key
            totype = edge["to"].keys()[0]

            fromvalues = edge["from"]
            tovalues = edge["to"][totype]

            for src in jsonnodes:
                if src["Metadata"]["Type"] == fromtype:
                    for dst in jsonnodes:
                        if dst["Metadata"]["Type"] == totype:
                            match = True
                            for idx, fromvalue in enumerate(fromvalues):
                                tovalue = tovalues[idx]
                                if tovalue not in dst["Metadata"] or fromvalue not in src["Metadata"] or \
                                        dst["Metadata"][
                                            tovalue] != \
                                        src["Metadata"][fromvalue]:
                                    match = False
                            if match:
                                jsondump = {"Metadata": {"RelationType": relationType},
                                            "ID": (str(
                                                "Edge-" + "(" + fromtype + ")" + src["ID"] + "-(" + totype + ")" +
                                                dst["ID"]+"["+relationType+"]")),
                                            "Parent": dst["ID"],
                                            "Child": src["ID"],
                                            "Origin": "SoftLayer"}
                                jsonedges.append(jsondump)
    return jsonedges


def readconfiguration(topologyrulesfile):
    dict = eval(topologyrulesfile.read())
    topologyrulesfile.close()
    return dict


## main function
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("topologyrulesfile",
                        help="Configuration file to include a python dictionary with rules to create topology",
                        type=argparse.FileType('r'))
    args = parser.parse_args()

    topologyrules = readconfiguration(args.topologyrulesfile)
    jsonnodes = buildNodes(topologyrules)
    jsonedges = buildEdges(topologyrules, jsonnodes)
    skydiveuijson = [{"Nodes": jsonnodes, "Edges": jsonedges}]
    print json.dumps(skydiveuijson, indent=4, sort_keys=True)


"""
Example (minimal) for format of output json to be used by Skydive
-==--=-=-==--==--=-==--=-=-==--=-=-=-=-==--=
[
	{
		"Nodes": [
			{
			    "ID": "testid"
				"Metadata": {
					"Type": "host",
					"Name": "test"
				}
			}
		],
		"Edges": [
            {
                "Parent": "testid"
                "Child": "testid", 
                "ID": "testedge", 
                "Metadata": {
                    "RelationType": "ownership"
            }		
		]
	}
]
"""

if __name__ == '__main__':
    main()
