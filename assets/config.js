var config = {
    "nodeAttrs": function (node) {
        var name = node.data.Name
        if (name.length > 8) {
            name = node.data.Name.substring(0, 12) + "."
        }

        var attrs = { classes: [node.data.Type], name: name, icon: "\uf192" }

        switch (node.data.Type) {
            case "host":
                attrs.icon = "\uf109"; break
            case "bridge":
            case "ovsbridge":
                attrs.icon = "\uf6ff"; break
            case "erspan":
                attrs.icon = "\uf1e0"; break
            case "vxlan":
            case "gre":
            case "gretap":
                attrs.icon = "\uf55b"; break
            case "interface":
            case "device":
            case "veth":
            case "tun":
            case "tap":
                attrs.icon = "\uf796"; break
            case "port":
            case "ovsport":
                attrs.icon = "\uf0e8"; break
            case "netns":
                attrs.icon = "\uf24d"; break
            default:
                attrs.icon = "\uf192"; break
        }

        return attrs
    },
    "nodeWeight": function (node) {
        switch (node.data.Type) {
            case "host":
                return 3
            case "bridge":
            case "ovsbridge":
                return 4
            case "veth":
                if (node.data.IPV4 && node.data.IPV4.length)
                    return 3
                return 7
            case "netns":
                return 8
            default:
        }

        if (node.data.OfPort) {
            return 5
        }

        return node.parent ? node.parent.weight : 1
    }
}