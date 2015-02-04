# Installs common VL dependencies for Centos
# Depends on the stahnma/epel module and python_pip module

include epel
include puppi
include python_pip

class vl_common {
  # Install default packages (curl/wget declared in puppi)
  package { ["subversion", "mercurial", "ftp", "bzip2",
             "bzip2-devel", "elfutils", "ntp", "ntpdate", "gcc", "gcc-c++",
             "gcc-gfortran", "compat-gcc-34-g77", "make", "openssh",
             "openssh-clients", "swig", "mlocate", "libxml2-devel",
             "libxslt-devel"]:
    ensure => installed,
    require => Class["epel"],
  }

  # I want the new one....
  package { ["ca-certificates" ]:
    ensure => latest,
    require => Class["epel"],
  }

  # Install default pip packages
  package {  ["boto", "pyproj", "python-swiftclient", "python-keystoneclient"]:
    ensure => installed,
    provider => "pip",
    require => [Class["python_pip"],
                Package["libxml2-devel", "libxslt-devel"]],
  }

  # Install startup bootstrap
  $curl_cmd = "/usr/bin/curl"
  $bootstrapLocation = "/etc/rc.d/rc.local"
  exec { "get-bootstrap":
    before => File[$bootstrapLocation],
    command => "$curl_cmd -L https://github.com/AuScope/VHIRL-Portal/raw/master/vm/ec2-run-user-data.sh > $bootstrapLocation",
  }
  file { $bootstrapLocation:
    ensure => present,
    mode => "a=rwx",
  }
}
