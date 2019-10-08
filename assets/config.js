var config = {
    "nodeAttrs": function (node) {
        var name = node.data.Name
        if (name.length > 24) {
            name = node.data.Name.substring(0, 24) + "."
        }

        var attrs = { classes: [node.data.Type], name: name, icon: "\uf192", weight: 0 }

        if (node.data.OfPort) {
            attrs.weight = 5
        }

        switch (node.data.Type) {
            case "host":
                attrs.icon = "\uf109"
                attrs.weight = 3
                break
            case "switch":
                attrs.icon = "\uf6ff"
                break
            case "bridge":
            case "ovsbridge":
                attrs.icon = "\uf6ff"
                attrs.weight = 4
                break
            case "erspan":
                attrs.icon = "\uf1e0"
                break
            case "geneve":
            case "vxlan":
            case "gre":
            case "gretap":
                attrs.icon = "\uf55b"
                break
            case "device":
            case "internal":
            case "interface":
            case "tun":
            case "tap":
                attrs.icon = "\uf796"
                attrs.weight = 7
                break
            case "veth":
                attrs.icon = "\uf4d7"
                attrs.weight = 7
                break
            case "switchport":
                attrs.icon = "\uf0e8"
                break
            case "patch":
            case "port":
            case "ovsport":
                attrs.icon = "\uf0e8"
                attrs.weight = 5
                break
            case "netns":
                attrs.icon = "\uf24d"
                attrs.weight = 8
                break
            case "libvirt":
                attrs.icon = "\uf109"
                attrs.weight = 9
                break
            default:
                attrs.icon = "\uf192"
                break
        }

        if (node.data.Manager === "docker") {
            attrs.icon = "\uf395"
            attrs.classes.push('font-brands')
        }

        if (node.data.IPV4 && node.data.IPV4.length) {
            attrs.weight = 3
        }

        if (node.data.Driver && ["tap", "veth", "tun", "openvswitch"].indexOf(node.data.Driver) < 0) {
            attrs.weight = 3
        }

        return attrs
    },
    "groupBy": function(node) {
        return node.data.Type ? node.data.Type : null
    },
    "weightTitles": {
        0: "Fabric",
        3: "Physical",
        4: "Bridges",
        5: "Ports",
        7: "Virtual",
        8: "Namespaces",
        9: "VMs"
    },
    "suggestions": [
        "data.IPV4",
        "data.MAC",
        "data.Name"
    ]
}